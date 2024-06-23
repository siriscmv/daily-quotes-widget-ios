// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: pink; icon-glyph: magic;
"use strict";

const RANDOM_COLOR_API = () => "https://colors.zoodinkers.com/api";
const COLOR_SCHEME_API = (color) =>
  `https://www.thecolorapi.com/scheme?hex=${color}&mode=monochrome&count=3`;
const QUOTE_API = () => "https://api.quotable.io/random";

async function randomColor() {
  const req = new Request(RANDOM_COLOR_API());
  const res = await req.loadJSON();
  return res["hex"].slice(1);
}

async function colorScheme(color) {
  const req = new Request(COLOR_SCHEME_API(color));
  const res = await req.loadJSON();

  const text = res["colors"][0]["hex"]["clean"];
  const start = res["colors"][1]["hex"]["clean"];
  const end = res["colors"][2]["hex"]["clean"];

  return { start, end, text };
}

async function randomQuote() {
  const req = new Request(QUOTE_API());
  const res = await req.loadJSON();
  return res;
}

function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return "th"; // special case for 11th to 13th
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function formatDate(date) {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const dayOfWeek = daysOfWeek[date.getDay()];
  const dayOfMonth = date.getDate();
  const month = months[date.getMonth()];

  const ordinalSuffix = getOrdinalSuffix(dayOfMonth);

  return `${dayOfWeek}, ${dayOfMonth}${ordinalSuffix} ${month}`;
}

function currentDateYYYYMMDD(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const formattedDate = `${year}-${month}-${day}`;

  return formattedDate;
}

async function getWidgetData() {
  const fm = FileManager.local();
  const path = fm.joinPath(fm.documentsDirectory(), "daily-quotes-widget-data");
  if (!fm.fileExists(path)) fm.createDirectory(path, false);

  const fileName = currentDateYYYYMMDD();

  const todayFile = fm.joinPath(path, `/${fileName}.json`);

  if (fm.fileExists(todayFile)) {
    const data = fm.readString(todayFile);
    return JSON.parse(data);
  }

  const ONE_DAY = 24 * 60 * 60 * 1000;
  const prevFileName = currentDateYYYYMMDD(new Date(Date.now() - ONE_DAY));
  const previousFile = fm.joinPath(path, `/${prevFileName}.json`);

  if (fm.fileExists(previousFile)) {
    fm.remove(previousFile);
  }

  const quote = await randomQuote();
  console.log("Random quote", quote);

  const color = await randomColor();
  console.log(`Random color: ${color}`);

  const { start, end, text } = await colorScheme(color);
  console.log(`Color scheme: ${start}, ${end}, ${text}`);

  const data = { quote, start, end, text };

  fm.writeString(todayFile, JSON.stringify(data));

  return data;
}

async function run() {
  const listWidget = new ListWidget();
  listWidget.useDefaultPadding();

  try {
    const data = await getWidgetData();
    const { quote, start, end, text } = data;

    const startColor = Color.dynamic(new Color(start), new Color(start));
    const endColor = Color.dynamic(new Color(end), new Color(end));
    const textColor = Color.dynamic(new Color(text), new Color(text));

    const gradient = new LinearGradient();
    gradient.colors = [startColor, endColor];
    gradient.locations = [0.0, 1];
    console.log({ gradient });

    listWidget.backgroundGradient = gradient;

    const headStack = listWidget.addStack();
    headStack.layoutHorizontally();
    headStack.topAlignContent();
    headStack.setPadding(0, 0, 0, 0);

    const textStack = headStack.addStack();
    textStack.layoutVertically();
    textStack.topAlignContent();
    textStack.setPadding(0, 0, 0, 0);

    const header = textStack.addText(
      `Daily Quote・${formatDate(new Date())}`.toUpperCase()
    );
    header.textColor = textColor;
    header.font = Font.regularSystemFont(10);
    header.minimumScaleFactor = 1;

    textStack.addSpacer(24);

    const wordLevel = textStack.addText(quote.content);
    wordLevel.textColor = textColor;
    wordLevel.font = new Font("Georgia", 18);
    wordLevel.minimumScaleFactor = 0.3;

    textStack.addSpacer(12);

    const locationText = textStack.addText(quote.author);
    locationText.textColor = textColor;
    locationText.font = Font.italicSystemFont(14);
    locationText.minimumScaleFactor = 0.5;
  } catch (error) {
    const errorWidgetText = listWidget.addText(`${error}`);
    errorWidgetText.textColor = Color.red();
    errorWidgetText.textOpacity = 30;
    errorWidgetText.font = Font.regularSystemFont(10);

    console.error(error);
  }

  if (config.runsInApp) {
    listWidget.presentSmall();
  }

  Script.setWidget(listWidget);
  Script.complete();
}

await run();
