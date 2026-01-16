const settings = require('../botSettings');
const axios = require('axios');

//=====================classes======================
const Player = require('./classes/Player');
const PlayerConfig = require('./classes/PlayerConfig');
const PlayerData = require('./classes/PlayerData');

// Fetch names lazily to avoid network calls during module load (graceful fallback)
async function fetchNames(count) {
  try {
    const res = await axios.get(`https://randomuser.me/api/?results=${count}`);
    return res && res.data && res.data.results ? res.data.results : generateFallback(count);
  } catch (err) {
    console.warn('[bots] randomuser fetch failed:', err && err.message ? err.message : err);
    return generateFallback(count);
  }
}

function generateFallback(count) {
  const list = [];
  for (let i = 0; i < count; i++) {
    list.push({ login: { username: `bot${Math.floor(Math.random() * 1000000)}` } });
  }
  return list;
}

async function initiateBots(bots, players, playerInfo) {
  const names = await fetchNames(settings.numBots);
  for (let i = 0; i < settings.numBots; i++) {
    const bot = new Player(null);
    const botConfig = new PlayerConfig(settings);
    const botData = new PlayerData(names[i].login.username, settings);
    bot.playerConfig = botConfig;
    bot.playerData = botData;
    players.push(botData);
    bots.push(bot);
    playerInfo.set(bot.playerData.uid, bot);
  }
}

async function pushBot(bots, players, playerInfo) {
  const names = await fetchNames(settings.numBots);
  const bot = new Player(null);
  const botConfig = new PlayerConfig(settings);
  const botData = new PlayerData(names[Math.floor(Math.random() * names.length)].login.username, settings);
  bot.playerConfig = botConfig;
  bot.playerData = botData;
  players.push(botData);
  bots.push(bot);
  playerInfo.set(bot.playerData.uid, bot);
}

function moveBots(bots, players, orbs) {
  bots.forEach(bot => {
    let minDist = settings.worldHeight * settings.worldWidth;
    let xVector = 0;
    let yVector = 0;
    let mousePosition = { x: 1000, y: 1000 };

    orbs.forEach(orb => {
      const dist = Math.abs(bot.playerData.locX - orb.locX) + Math.abs(bot.playerData.locY - orb.locY);
      if (dist <= minDist) {
        minDist = dist;
        mousePosition = { x: orb.locX, y: orb.locY };
      }
    });

    players.forEach(p => {
      const dist = Math.abs(bot.playerData.locX - p.locX) + Math.abs(bot.playerData.locY - p.locY);
      if (dist <= minDist && p.radius < bot.playerData.radius) {
        minDist = dist;
        mousePosition = { x: p.locX, y: p.locY };
      }
    });

    const angleDeg = Math.atan2(mousePosition.y - bot.playerData.locY, mousePosition.x - bot.playerData.locX) * 180 / Math.PI;
    if (angleDeg >= 0 && angleDeg < 90) {
      xVector = 1 - (angleDeg / 90);
      yVector = -(angleDeg / 90);
    } else if (angleDeg >= 90 && angleDeg <= 180) {
      xVector = -(angleDeg - 90) / 90;
      yVector = -(1 - ((angleDeg - 90) / 90));
    } else if (angleDeg >= -180 && angleDeg < -90) {
      xVector = (angleDeg + 90) / 90;
      yVector = (1 + ((angleDeg + 90) / 90));
    } else if (angleDeg < 0 && angleDeg >= -90) {
      xVector = (angleDeg + 90) / 90;
      yVector = (1 - ((angleDeg + 90) / 90));
    }

    bot.playerConfig.xVector = xVector;
    bot.playerConfig.yVector = yVector;

    const speed = bot.playerConfig.speed;
    const xV = bot.playerConfig.xVector;
    const yV = bot.playerConfig.yVector;

    if ((bot.playerData.locX < 5 && xV < 0) || (bot.playerData.locX > settings.worldWidth && xV > 0)) {
      if (bot.playerData.locY > 5 && bot.playerData.locY < settings.worldHeight) bot.playerData.locY -= speed * yV;
    } else if ((bot.playerData.locY < 5 && yV > 0) || (bot.playerData.locY > settings.worldHeight && yV < 0)) {
      if (bot.playerData.locX > 5 && bot.playerData.locX < settings.worldWidth) bot.playerData.locX += speed * xV;
    } else {
      bot.playerData.locX += speed * xV;
      bot.playerData.locY -= speed * yV;
    }
  });
}

module.exports = { initiateBots, moveBots, pushBot };



