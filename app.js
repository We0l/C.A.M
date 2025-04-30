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
  secret:    getCams('secret_cam'),
};

const camToTier = {};
Object.entries(tiers).forEach(([tier, cams]) => {
  cams.forEach(cam => { camToTier[cam] = tier; });
});

const probabilities = {
  common:    0.80,
  rare:      0.14,
  epic:      0.05,
  legendary: 0.00909,
  mythic:    0.0009,
  secret:    0.00001,
};

const tierColors = {
  common:    '#8C8C8C',
  rare:      '#40D6DB',
  epic:      '#C300FF',
  legendary: '#EDC600',
  mythic:    '#50e3c2',
  secret:    '#e74c3c',
};

const displayOrder = ['secret','mythic','legendary','epic','rare','common'];

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
  return { cam, tier };
}

let rollCounts = {};
try {
  rollCounts = JSON.parse(localStorage.getItem('rollCounts')) || {};
} catch (e) {
  rollCounts = {};
}

const gradientClass = 'gradient-mythic';

function renderEncyclopedia(rolledList) {
  rolledList.innerHTML = '';
  let firstTier = true;
  displayOrder.forEach(tier => {
    const camsInTier = Object.entries(rollCounts)
      .filter(([cam, count]) => camToTier[cam] === tier)
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
      if (tier === 'mythic') {
        li.classList.add(gradientClass);
      } else {
        li.style.color = tierColors[tier];
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
    } else if (tierColors[name]) {
      li.style.color = tierColors[name];
    }
  });

  rollButton.addEventListener('click', () => {
    if (isCooldown) return;
    const { cam, tier } = rollCam();
    resultEl.textContent = cam;
    container.style.backgroundColor = tierColors[tier] || '#000';

    rollCounts[cam] = (rollCounts[cam] || 0) + 1;
    localStorage.setItem('rollCounts', JSON.stringify(rollCounts));
    renderEncyclopedia(rolledList);
    startCooldown(1000);
  });
});