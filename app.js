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
  common: 5000,
  rare: 3500,
  epic: 2000,
  legendary: 1000,
  mythic: 750
};

const coinValues = {
  common: 10,
  rare: 50,
  epic: 150,
  legendary: 750,
  mythic: 7500,
  divine: 75000,
  secret: 750000
};

let camcoinBalance = parseInt(localStorage.getItem('camcoinBalance')) || 0;
let totalRollCount = parseInt(localStorage.getItem('totalRollCount')) || 0;

const mindsetData = {
  beta: {
    probabilities: {
      common: 0.77,
      rare: 0.155,
      epic: 0.06,
      legendary: 0.014089,
      mythic: 0.00090,
      divine: 0.00001,
      secret: 0.000001
    },
    requiredTier: 'epic',
    requiredCount: 10,
    coinCost: 1000,
    cooldownBonus: 0
  },
  alpha: {
    probabilities: {
      common: 0.70,
      rare: 0.185,
      epic: 0.10,
      legendary: 0.013089,
      mythic: 0.00190,
      divine: 0.00001,
      secret: 0.000001
    },
    requiredTier: 'legendary',
    requiredCount: 10,
    coinCost: 7000,
    cooldownBonus: 200
  },
  sigma: {
    probabilities: {
      common: 0.64,
      rare: 0.215,
      epic: 0.12,
      legendary: 0.021059,
      mythic: 0.00390,
      divine: 0.00004,
      secret: 0.000001
    },
    requiredTier: 'mythic',
    requiredCount: 10,
    coinCost: 80000,
    cooldownBonus: 100
  },
  autoroll: {
    probabilities: {
      common:    0.80,
      rare:      0.14,
      epic:      0.05,
      legendary: 0.009089,
      mythic:    0.00090,
      divine:    0.00001,
      secret:    0.000001
    },
    requiredTier: 'divine',
    requiredCount: 2,
    coinCost: 0,
    cooldownBonus: 0
  }
};

let currentMindset = null;
let mindsetCooldownBonus = 0;
let purchasedMindsets = JSON.parse(localStorage.getItem('purchasedMindsets')) || {};

function pickTier() {
  const r = Math.random();
  let sum = 0;
  const probs = currentMindset ? mindsetData[currentMindset].probabilities : probabilities;
  for (const [tier, prob] of Object.entries(probs)) {
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

if (totalRollCount === 0) {
  totalRollCount = Object.values(rollCounts).reduce((sum, count) => sum + count, 0);
  localStorage.setItem('totalRollCount', totalRollCount);
  console.log('Migrated roll count:', totalRollCount);
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

function updateCamcoinDisplay() {
  document.getElementById('camcoin-balance').textContent = camcoinBalance.toLocaleString();
}

function sellCam(cam, count) {
  const tier = camToTier[cam];
  const value = coinValues[tier];
  const earnings = value * count;
  
  rollCounts[cam] -= count;
  if (rollCounts[cam] <= 0) {
    delete rollCounts[cam];
  }
  localStorage.setItem('rollCounts', JSON.stringify(rollCounts));
  
  camcoinBalance += earnings;
  localStorage.setItem('camcoinBalance', camcoinBalance);
  
  updateCamcoinDisplay();
  renderEncyclopedia(document.getElementById('rolled-list'));
}

function renderEncyclopedia(rolledList) {
  rolledList.innerHTML = '';
  
  document.getElementById('total-rolls').textContent = totalRollCount;
  
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
      li.className = 'cam-entry';
      
      const camText = document.createElement('span');
      camText.textContent = `${cam} (${displayTier}): x${count}`;
      li.appendChild(camText);

      const sellOptionsContainer = document.createElement('div');
      sellOptionsContainer.className = 'sell-options';
      
      const amounts = [1, 10, 100];
      amounts.forEach(amt => {
        if (count >= amt) {
          const btn = document.createElement('button');
          btn.className = 'sell-button';
          const coinValue = coinValues[tier] * amt;
          btn.textContent = `Sell ${amt} for ${coinValue.toLocaleString()} 🪟`;
          btn.onclick = (e) => {
            e.stopPropagation();
            sellCam(cam, amt);
          };
          sellOptionsContainer.appendChild(btn);
        }
      });

      const sellAllBtn = document.createElement('button');
      sellAllBtn.className = 'sell-button';
      const totalValue = coinValues[tier] * count;
      sellAllBtn.textContent = `Sell All (${count}) for ${totalValue.toLocaleString()} 🪟`;
      sellAllBtn.onclick = (e) => {
        e.stopPropagation();
        sellCam(cam, count);
      };
      sellOptionsContainer.appendChild(sellAllBtn);
      
      li.onclick = (e) => {
        document.querySelectorAll('.sell-options.active').forEach(el => {
          if (el !== sellOptionsContainer) {
            el.classList.remove('active');
          }
        });
        sellOptionsContainer.classList.toggle('active');
      };

      li.appendChild(sellOptionsContainer);

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

document.addEventListener('click', (e) => {
  if (!e.target.closest('.cam-entry')) {
    document.querySelectorAll('.sell-options.active').forEach(el => {
      el.classList.remove('active');
    });
  }
});

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
  const mindsetsButton = document.getElementById('mindsets-button');
  const mindsetsPopup = document.getElementById('mindsets-popup');
  const closeMindsetsBtn = document.getElementById('close-mindsets');
  const mindsetButtons = document.querySelectorAll('.mindset-button');
  let isMuted = false;
  let isBgEnabled = true;

  const buttonClickSound = new Audio("resources/button-click.mp3");
  const purchaseSound = new Audio("resources/purchase.mp3");
  const purchaseFailSound = new Audio("resources/purchasefail.mp3");

  muteButton.addEventListener('click', () => {
    buttonClickSound.play();
    isMuted = !isMuted;
    muteButton.textContent = isMuted ? 'Unmute' : 'Mute';
  });

  bgToggle.addEventListener('click', () => {
    buttonClickSound.play();
    isBgEnabled = !isBgEnabled;
    playArea.classList.toggle('no-background');
    bgToggle.textContent = isBgEnabled ? 'BG' : 'No BG';
  });

  infoButton.addEventListener('click', () => {
    buttonClickSound.play();
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

  mindsetsButton.addEventListener('click', () => {
    buttonClickSound.play();
    mindsetsPopup.style.display = 'block';
  });
  
  closeMindsetsBtn.addEventListener('click', () => {
    buttonClickSound.play();
    mindsetsPopup.style.display = 'none';
  });
  
  mindsetButtons.forEach(btn => {
    const m = btn.dataset.mindset;
    if (purchasedMindsets[m]) {
      btn.textContent = (currentMindset === m) ? 'Active' : 'Purchased';
    }
  });

  let autorollTimeout;

  function scheduleAutoroll() {
    if (currentMindset !== 'autoroll') return;
    const cooldown = window.getCurrentCooldown();
    autorollTimeout = setTimeout(() => {
      if (!isCooldown) {
        rollButton.click();
      }
      scheduleAutoroll();
    }, cooldown + 10);
  }

  mindsetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttonClickSound.play();
      const mindset = btn.dataset.mindset;
      if (purchasedMindsets[mindset]) {
        if (currentMindset === mindset) {
          currentMindset = null;
          mindsetCooldownBonus = 0;
          btn.textContent = 'Purchased';
          mindsetButtons.forEach(b => {
            if (purchasedMindsets[b.dataset.mindset] && b.dataset.mindset !== mindset) {
              b.textContent = 'Purchased';
            }
          });
          if (mindset === 'autoroll') clearTimeout(autorollTimeout);
        } else {
          currentMindset = mindset;
          mindsetCooldownBonus = mindsetData[mindset].cooldownBonus;
          mindsetButtons.forEach(b => {
            b.textContent = (b.dataset.mindset === mindset) ? 'Active' : (purchasedMindsets[b.dataset.mindset] ? 'Purchased' : 'Purchase');
          });
          if (mindset === 'autoroll') scheduleAutoroll();
          else clearTimeout(autorollTimeout);
        }
        return;
      }
      if (currentMindset !== null) return;
      
      const req = mindsetData[mindset];
      let available = 0;
      const eligibleCams = [];
      Object.entries(rollCounts).forEach(([cam, count]) => {
        if (!cam.startsWith('Shiny ') && camToTier[cam] === req.requiredTier) {
          available += count;
          eligibleCams.push({ cam, count });
        }
      });
      if (available < req.requiredCount || camcoinBalance < req.coinCost) {
        purchaseFailSound.play();
        return;
      }
      let remaining = req.requiredCount;
      eligibleCams.sort(() => 0.5 - Math.random());
      for (const { cam, count } of eligibleCams) {
        if (remaining <= 0) break;
        const removeCount = Math.min(count, remaining);
        rollCounts[cam] -= removeCount;
        remaining -= removeCount;
        if (rollCounts[cam] <= 0) delete rollCounts[cam];
      }
      localStorage.setItem('rollCounts', JSON.stringify(rollCounts));
      camcoinBalance -= req.coinCost;
      localStorage.setItem('camcoinBalance', camcoinBalance);
      updateCamcoinDisplay();
      
      purchasedMindsets[mindset] = true;
      localStorage.setItem('purchasedMindsets', JSON.stringify(purchasedMindsets));
      currentMindset = mindset;
      mindsetCooldownBonus = req.cooldownBonus;
      mindsetButtons.forEach(b => {
        b.textContent = (b.dataset.mindset === mindset) ? 'Active' : (purchasedMindsets[b.dataset.mindset] ? 'Purchased' : 'Purchase');
      });
      mindsetsPopup.style.display = 'none';
      renderEncyclopedia(document.getElementById('rolled-list'));
      purchaseSound.play();
      if (mindset === 'autoroll') scheduleAutoroll();
    });
  });

  const originalGetCooldown = getCurrentCooldown;
  window.getCurrentCooldown = function() {
    const base = originalGetCooldown();
    return Math.max(base - mindsetCooldownBonus, 100);
  };

  function playRollSound(tier) {
    if (isMuted) return;

    const glassBreak = document.getElementById('glass-break');
    const perfectFart = document.getElementById('perfect-fart');
    const legendarySound = document.getElementById('legendary-sound');
    const divineSound = document.getElementById('divine-sound');
    const mythicSound = document.getElementById('mythic-sound');
    const secretSound = document.getElementById('secret-sound');

    if (tier === 'mythic') {
      mythicSound.currentTime = 0;
      mythicSound.play();
    } else if (tier === 'divine') {
      divineSound.currentTime = 0;
      divineSound.play();
    } else if (tier === 'legendary') {
      legendarySound.currentTime = 0;
      legendarySound.play();
    } else if (tier === 'secret') {
      if (secretSound) {
        secretSound.currentTime = 0;
        secretSound.play();
      }
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
  updateCamcoinDisplay();

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

    totalRollCount++;
    localStorage.setItem('totalRollCount', totalRollCount);

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

  function spawnAntiAfkButton() {
    const overlay = document.createElement('div');
    overlay.id = 'afk-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '10000';
    
    const btn = document.createElement('button');
    btn.id = 'afk-button';
    btn.textContent = '🤠';
    btn.style.position = 'absolute';
    const vw = window.innerWidth - 120;
    const vh = window.innerHeight - 60;
    const randomLeft = Math.floor(Math.random() * vw);
    const randomTop = Math.floor(Math.random() * vh);
    btn.style.left = randomLeft + 'px';
    btn.style.top = randomTop + 'px';
    btn.style.padding = '10px 20px';
    btn.style.fontSize = '16px';
    btn.style.borderRadius = '12px';
    btn.style.cursor = 'pointer';
    
    overlay.appendChild(btn);
    document.body.appendChild(overlay);
    
    btn.addEventListener('click', () => {
      overlay.remove();
      resetAntiAfkTimer();
    });
  }
  
  let antiAfkTimer;
  function resetAntiAfkTimer() {
    if (antiAfkTimer) clearInterval(antiAfkTimer);
    antiAfkTimer = setInterval(spawnAntiAfkButton, 300000);
  }
  
  resetAntiAfkTimer();
});