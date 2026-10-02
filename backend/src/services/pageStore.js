const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../../data");
const FILE_PATH = path.join(DATA_DIR, "pages.json");

// Ensure data directory and file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(FILE_PATH)) {
  fs.writeFileSync(FILE_PATH, JSON.stringify({}), "utf8");
}

function readData() {
  try {
    const content = fs.readFileSync(FILE_PATH, "utf8");
    return JSON.parse(content);
  } catch (error) {
    console.error("[PageStore] Error reading file:", error);
    return {};
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("[PageStore] Error writing file:", error);
  }
}

module.exports = {
  savePage: (pageId, name, accessToken) => {
    const data = readData();
    data[pageId] = {
      pageId,
      name,
      accessToken,
      connectedAt: new Date().toISOString(),
    };
    writeData(data);
    console.log(`[PageStore] Saved page: ${name} (${pageId})`);
  },

  getPage: (pageId) => {
    const data = readData();
    return data[pageId] || null;
  },

  getAllPages: () => {
    const data = readData();
    return Object.values(data);
  },

  deletePage: (pageId) => {
    const data = readData();
    if (data[pageId]) {
      const name = data[pageId].name;
      delete data[pageId];
      writeData(data);
      console.log(`[PageStore] Deleted page: ${name} (${pageId})`);
      return true;
    }
    return false;
  },
};
