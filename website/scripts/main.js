/* ============================================================
   AeroGrab — launch site interactions
   ============================================================ */

const SITE = {
  githubUsername: 'nuruddin-deyoan',
  repoName: 'AeroGrab',
  version: '1.0.0',
  assetName: 'aerograb-1.0.0-setup.exe',
  fileSize: '~191 MB',
  sha256: '9588c6d2c7d199bb2d28bd88f68e785d4b8279e59398be5b6aa0a670b3857f48'
};

function releaseUrl(path) {
  return `https://github.com/${SITE.githubUsername}/${SITE.repoName}${path}`;
}

function initLinks() {
  document.querySelectorAll('[data-dl="setup"]').forEach((a) => {
    a.href = releaseUrl(`/releases/latest/download/${SITE.assetName}`);
  });
  document.querySelectorAll('[data-link="releases"]').forEach((a) => {
    a.href = releaseUrl('/releases');
  });
  document.querySelectorAll('[data-link="issues"]').forEach((a) => {
    a.href = releaseUrl('/issues');
  });
  document.querySelectorAll('[data-link="source"]').forEach((a) => {
    a.href = releaseUrl('');
  });
  document.querySelectorAll('[data-link="profile"]').forEach((a) => {
    a.href = `https://github.com/${SITE.githubUsername}`;
  });
}

function initPlaceholders() {
  document.querySelectorAll('[data-site="version"]').forEach((el) => {
    el.textContent = `v${SITE.version}`;
  });
  document.querySelectorAll('[data-site="asset"]').forEach((el) => {
    el.textContent = SITE.assetName;
  });
  document.querySelectorAll('[data-site="size"]').forEach((el) => {
    el.textContent = SITE.fileSize;
  });
  document.querySelectorAll('[data-site="sha256"]').forEach((el) => {
    el.textContent = SITE.sha256;
  });
}

function initCopyButtons() {
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const target = document.querySelector(btn.getAttribute('data-copy'));
      const text = target ? target.textContent.trim() : SITE.sha256;
      const original = btn.textContent;
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'Copied!';
      } catch {
        btn.textContent = 'Copy failed';
      }
      setTimeout(() => {
        btn.textContent = original;
      }, 1600);
    });
  });
}

function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  links.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => links.classList.remove('open'));
  });
}

function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('visible'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  els.forEach((el) => observer.observe(el));
}

function initYear() {
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initLinks();
  initPlaceholders();
  initCopyButtons();
  initNav();
  initReveal();
  initYear();
});
