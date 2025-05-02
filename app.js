const getCams = (id) => {
  const html = document.getElementById(id).innerHTML;
  return html
    .split(/<br\s*\/?\s*>/gi)
    .map(s => s.trim())
    .filter(Boolean);
};

const tiers = {
  common:    getCams('common_cam'),
  rare:      getCams('rare_cam'),
  epic:      getCams('epic_cam'),
  legendary: getCams('legendary_cam'),
  mythic:    getCams('mythic_cam'),
  divine:    getCams('divine_cam'),
  secret:    getCams('secret_cam'),
};

const camToTier = {};
Object.entries(tiers).forEach(([tier, cams]) => {
  cams.forEach(cam => { 
    camToTier[cam] = tier;
    camToTier[`Shiny ${cam}`] = tier;
  });
});

const probabilities = {
  common:    0.80,
  rare:      0.14,
  epic:      0.05,
  legendary: 0.009089,
  mythic:    0.00090,
  divine:    0.00001,
  secret:    0.000001,
};

const tierColors = {
  common:    '#8C8C8C',
  rare:      '#40D6DB',
  epic:      '#C300FF',
  legendary: '#EDC600',
  mythic:    '#50e3c2',
  divine:    '#ff69b4',
  secret:    '#e74c3c',
};

const displayOrder = ['secret', 'divine', 'mythic', 'legendary', 'epic', 'rare', 'common'];

const cooldownTiers = {
  base: 10000,
  common: 8000,
  rare: 6000,
  epic: 4000,
  legendary: 2000,
  mythic: 1000
};

function pickTier() {
  const r = Math.random();
  let sum = 0;
  for (const [tier, prob] of Object.entries(probabilities)) {
    sum += prob;
    if (r <= sum) return tier;
  }
  return 'common';
}

function rollCam() {
  const tier = pickTier();
  const arr = tiers[tier];
  const cam = arr[Math.floor(Math.random() * arr.length)];
  const isShiny = Math.random() < 0.01;
  const shinyTag = isShiny ? 'Shiny ' : '';
  return { cam: `${shinyTag}${cam}`, tier, isShiny };
}

let rollCounts = {};
try {
  rollCounts = JSON.parse(localStorage.getItem('rollCounts')) || {};
} catch (e) {
  rollCounts = {};
}

function getCurrentCooldown() {
  const tierCounts = {};
  Object.entries(rollCounts).forEach(([cam, count]) => {
    if (!cam.startsWith('Shiny ')) {
      const tier = camToTier[cam];
      tierCounts[tier] = (tierCounts[tier] || 0) + count;
    }
  });

  if (tierCounts.mythic >= 10) return cooldownTiers.mythic;
  if (tierCounts.legendary >= 10) return cooldownTiers.legendary;
  if (tierCounts.epic >= 10) return cooldownTiers.epic;
  if (tierCounts.rare >= 10) return cooldownTiers.rare;
  if (tierCounts.common >= 10) return cooldownTiers.common;
  return cooldownTiers.base;
}

const gradientClass = 'gradient-mythic';

function renderEncyclopedia(rolledList) {
  rolledList.innerHTML = '';
  
  const totalRolls = Object.values(rollCounts).reduce((sum, count) => sum + count, 0);
  document.getElementById('total-rolls').textContent = totalRolls;
  
  let firstTier = true;
  displayOrder.forEach(tier => {
    const camsInTier = Object.entries(rollCounts)
      .filter(([cam, count]) => camToTier[cam] === tier)
      .sort((a, b) => {
        const aShiny = a[0].startsWith('Shiny ');
        const bShiny = b[0].startsWith('Shiny ');
        if (aShiny !== bShiny) return aShiny ? 1 : -1;
        return a[0].localeCompare(b[0]);
      })
      .map(([cam, count]) => ({ cam, count }));
    
    if (camsInTier.length === 0) return;

    if (!firstTier) {
      const spacer = document.createElement('li');
      spacer.style.listStyleType = 'none';
      spacer.style.margin = '0.5em 0';
      rolledList.appendChild(spacer);
    }
    firstTier = false;

    camsInTier.forEach(({ cam, count }) => {
      const displayTier = tier.charAt(0).toUpperCase() + tier.slice(1);
      const li = document.createElement('li');
      li.textContent = `${cam} (${displayTier}): x${count}`;
      const isShiny = cam.startsWith('Shiny ');
      
      if (tier === 'mythic') {
        li.classList.add(gradientClass);
      } else if (tier === 'divine') {
        li.classList.add('gradient-divine');
      } else {
        const color = tierColors[tier];
        if (isShiny) {
          li.style.color = color;
          li.style.textShadow = `0 0 10px ${color}`;
          li.style.filter = 'brightness(1.5)';
        } else {
          li.style.color = color;
        }
      }
      rolledList.appendChild(li);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const rollButton = document.getElementById('roll-button');
  const resultEl = document.getElementById('result');
  const container = document.getElementById('result-container');
  const rolledList = document.getElementById('rolled-list');
  const cooldownEl = document.getElementById('cooldown-timer');
  const muteButton = document.getElementById('mute-button');
  const bgToggle = document.getElementById('bg-toggle');
  const playArea = document.getElementById('play-area');
  const infoButton = document.getElementById('info-button');
  const popup = document.getElementById('info-popup');
  const closePopup = document.getElementById('close-popup');
  let isMuted = false;
  let isBgEnabled = true;

  muteButton.addEventListener('click', () => {
    isMuted = !isMuted;
    muteButton.textContent = isMuted ? 'Unmute' : 'Mute';
  });

  bgToggle.addEventListener('click', () => {
    isBgEnabled = !isBgEnabled;
    playArea.classList.toggle('no-background');
    bgToggle.textContent = isBgEnabled ? 'BG' : 'No BG';
  });

  infoButton.addEventListener('click', () => {
    popup.style.display = 'block';
  });

  closePopup.addEventListener('click', () => {
    popup.style.display = 'none';
  });

  window.addEventListener('click', (e) => {
    if (e.target === popup) {
      popup.style.display = 'none';
    }
  });

  function playRollSound(tier) {
    if (isMuted) return;

    const glassBreak = document.getElementById('glass-break');
    const perfectFart = document.getElementById('perfect-fart');
    const legendarySound = document.getElementById('legendary-sound');
    const divineSound = document.getElementById('divine-sound');
    const mythicSound = document.getElementById('mythic-sound');

    if (tier === 'mythic') {
      mythicSound.currentTime = 0;
      mythicSound.play();
    } else if (tier === 'divine') {
      divineSound.currentTime = 0;
      divineSound.play();
    } else if (tier === 'legendary') {
      legendarySound.currentTime = 0;
      legendarySound.play();
    } else {
      const random = Math.random();
      if (random < 0.995) {
        glassBreak.currentTime = 0;
        glassBreak.play();
      } else {
        perfectFart.currentTime = 0;
        perfectFart.play();
      }
    }
  }

  let isCooldown = false;
  let cooldownInterval;

  function startCooldown(duration = 1000) {
    isCooldown = true;
    rollButton.disabled = true;
    let remaining = duration;
    cooldownEl.textContent = `Cooldown: ${remaining}ms`;
    cooldownInterval = setInterval(() => {
      remaining -= 100;
      if (remaining > 0) {
        cooldownEl.textContent = `Cooldown: ${remaining}ms`;
      } else {
        clearInterval(cooldownInterval);
        isCooldown = false;
        rollButton.disabled = false;
        cooldownEl.textContent = '';
      }
    }, 100);
  }

  renderEncyclopedia(rolledList);

  document.querySelectorAll('#tiers-info li').forEach(li => {
    const name = li.textContent.split(':')[0].toLowerCase();
    if (name === 'mythic') {
      li.classList.add(gradientClass);
    } else if (name === 'divine') {
      li.classList.add('gradient-divine');
    } else if (tierColors[name]) {
      li.style.color = tierColors[name];
    }
  });

  rollButton.addEventListener('click', () => {
    if (isCooldown) return;

    const { cam, tier, isShiny } = rollCam();
    playRollSound(tier);

    resultEl.textContent = cam;
    
    container.classList.remove('mythic-container', 'divine-container');
    if (tier === 'mythic') {
      container.classList.add('mythic-container');
    } else if (tier === 'divine') {
      container.classList.add('divine-container');
    } else {
      container.style.backgroundColor = tierColors[tier] || '#000';
    }
    
    if (isShiny) {
      resultEl.classList.add('shiny-text');
      resultEl.style.removeProperty('color');
    } else {
      resultEl.classList.remove('shiny-text');
      resultEl.style.color = '#000000';
    }

    rollCounts[cam] = (rollCounts[cam] || 0) + 1;
    localStorage.setItem('rollCounts', JSON.stringify(rollCounts));
    renderEncyclopedia(rolledList);
    startCooldown(getCurrentCooldown());
  });
});