const axios = require("axios");
const fs = require("fs");
const path = require("path");
const yts = require("yt-search");

module.exports = {
  config: {
    name: "sing",
    aliases: ["music", "song"],
    version: "1.0.0",
    author: "SADIKUR RAHMAN", // YOUR NAME
    countDown: 5,
    role: 0,
    shortDescription: "Play any music",
    longDescription: "Search and download music from YouTube (supports multi pull)",
    category: "MUSIC",
    guide: "/music <song name> [limit]\n/music arijit 5"
  },

  onStart: async function ({ api, event, args }) {
    if (!args.length)
      return api.sendMessage("❌ Provide a song name or YouTube URL.", event.threadID, event.messageID);

    // last arg is number? (multi pull)
    let limit = 1;
    if (!isNaN(args[args.length - 1])) {
      limit = parseInt(args.pop());
      if (limit < 1 || limit > 10) limit = 1;
    }

    const query = args.join(" ");
    const waiting = await api.sendMessage("🎵 Searching... please wait", event.threadID);

    try {
      let videoList = [];

      if (query.startsWith("http")) {
        videoList = [{ url: query }];
      } else {
        const results = await yts(query);
        if (!results.videos.length) throw new Error("No results found.");
        videoList = results.videos.slice(0, limit);
      }

      for (const vid of videoList) {
        const apiURL = `http://65.109.80.126:20409/aryan/play?url=${encodeURIComponent(vid.url)}`;
        const res = await axios.get(apiURL);
        const data = res.data;

        if (!data.status || !data.downloadUrl)
          throw new Error("API failed to return download URL.");

        const fileName = `${data.title}.mp3`.replace(/[\\/:"*?<>|]/g, "");
        const filePath = path.join(__dirname, fileName);

        const song = await axios.get(data.downloadUrl, { responseType: "arraybuffer" });
        fs.writeFileSync(filePath, song.data);

        await api.sendMessage(
          {
            attachment: fs.createReadStream(filePath),
            body: `🎵 𝗠𝗨𝗦𝗜𝗖 (${videoList.indexOf(vid) + 1}/${videoList.length})\n━━━━━━━━━━━━━━━\n${data.title}`
          },
          event.threadID,
          () => fs.unlinkSync(filePath)
        );
      }

      api.unsendMessage(waiting.messageID);

    } catch (err) {
      console.error(err);
      api.sendMessage("❌ Error: " + err.message, event.threadID);
      api.unsendMessage(waiting.messageID);
    }
  }
};
