// src/utils/alien-card.ts
// Este módulo se carga de forma LAZY (solo cuando el usuario pincha en un marker)

import { ALIEN_TYPES } from '@/data/alien_types';

// Crear mapa de slug -> folder
const typeMap = new Map(ALIEN_TYPES.map((type) => [type.slug, type.folder]));
// Crear mapa de slug -> name
const typeNameMap = new Map(ALIEN_TYPES.map((type) => [type.slug, type.name]));

let initialized = false;
let currentAnimationInterval: number | null = null;

// Acepta Unix timestamp en segundos (number) o ISO string (string)
function formatRelativeTime(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';

  const date =
    typeof value === 'number'
      ? new Date(value * 1000) // Unix timestamp → ms
      : new Date(value); // ISO string → ms

  const diffMs = Date.now() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 90) return `hace ${Math.floor(diffDays / 30)} meses`;
  if (diffDays > 0) return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  if (diffHours > 0) return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffMins > 0) return `hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
  return `hace ${diffSecs} segundo${diffSecs !== 1 ? 's' : ''}`;
}

function openViewer(src: string) {
  const viewer = document.getElementById('card-image-viewer')!;
  const viewerImg = document.getElementById('card-image-viewer-img') as HTMLImageElement;
  viewerImg.src = src;
  viewer.style.display = 'flex';
}

function closeViewer() {
  const viewer = document.getElementById('card-image-viewer')!;
  viewer.style.display = 'none';
}

function setupListeners() {
  if (initialized) return;
  initialized = true;

  const card = document.getElementById('alien-card')!;
  const closeBtn = document.getElementById('close-card')!;
  const viewer = document.getElementById('card-image-viewer')!;
  const viewerClose = document.getElementById('card-image-viewer-close')!;

  // Cerrar viewer
  viewerClose.addEventListener('click', (e) => {
    e.stopPropagation();
    closeViewer();
  });

  viewer.addEventListener('click', (e) => {
    if (e.target === viewer) closeViewer();
  });

  // Cerrar card
  closeBtn.addEventListener('click', () => {
    card.classList.add('hidden');
    if (currentAnimationInterval !== null) {
      clearInterval(currentAnimationInterval);
      currentAnimationInterval = null;
    }
  });

  card.addEventListener('click', (e) => {
    if (e.target === card) {
      card.classList.add('hidden');
      if (currentAnimationInterval !== null) {
        clearInterval(currentAnimationInterval);
        currentAnimationInterval = null;
      }
    }
  });
}

function startAnimation(folder: string) {
  if (currentAnimationInterval !== null) {
    clearInterval(currentAnimationInterval);
  }

  const animImg = document.getElementById('card-animation') as HTMLImageElement;
  let frameIndex = 1;

  animImg.src = `/imgs/aliens/${folder}/000${frameIndex}.webp`;

  currentAnimationInterval = window.setInterval(() => {
    frameIndex++;
    if (frameIndex > 5) {
      clearInterval(currentAnimationInterval!);
      currentAnimationInterval = null;
      return;
    }
    animImg.src = `/imgs/aliens/${folder}/000${frameIndex}.webp`;
  }, 150);
}

export function displayAlienInfo(alien: Record<string, any>) {
  setupListeners();

  const card = document.getElementById('alien-card')!;
  const animImg = document.getElementById('card-animation') as HTMLImageElement;
  const realImgWrapper = document.getElementById('card-real-image') as HTMLDivElement;
  const realImgInner = document.getElementById('card-real-image-im') as HTMLImageElement;

  const folder = typeMap.get(alien.type) || 'default';
  const realImagePath = alien.image_url ?? 'https://placehold.co/80x80/f0edf5/c084fc?text=👾';

  // Clonar para limpiar listeners anteriores
  const animImgClone = animImg.cloneNode(true) as HTMLImageElement;
  animImg.parentNode!.replaceChild(animImgClone, animImg);
  const realImgWrapperClone = realImgWrapper.cloneNode(true) as HTMLDivElement;
  realImgWrapper.parentNode!.replaceChild(realImgWrapperClone, realImgWrapper);

  const newAnimImg = document.getElementById('card-animation') as HTMLImageElement;
  const newRealImgWrapper = document.getElementById('card-real-image') as HTMLDivElement;
  const newRealImgInner = document.getElementById('card-real-image-im') as HTMLImageElement;

  // El src del img interno se actualiza al alien actual
  newRealImgInner.src = realImagePath;

  startAnimation(folder);

  let isRealSelected = false;

  newRealImgWrapper.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isRealSelected) {
      // switch to real image
      if (currentAnimationInterval !== null) {
        clearInterval(currentAnimationInterval);
        currentAnimationInterval = null;
      }
      newAnimImg.src = realImagePath;
      newRealImgInner.src = realImagePath;
      isRealSelected = true;
    } else {
      // switch back to animated sequence
      newRealImgInner.src = realImagePath;
      startAnimation(folder);
      isRealSelected = false;
    }
  });

  // Evitar que el click en la animación principal cierre el card
  newAnimImg.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // ID del alien
  document.getElementById('card-id')!.textContent = `#${alien.codename ?? ''}`;

  // Tipo del alien
  const typeName = typeNameMap.get(alien.type) || alien.type;
  document.getElementById('card-type')!.textContent = typeName;

  // Drop
  const dropTime = formatRelativeTime(alien.created_at);
  const dropBy = alien.created_by ?? '?';
  document.getElementById('card-drop')!.innerHTML =
    `Dejado por <strong>${dropBy}</strong>${dropTime ? ` · ${dropTime}` : ''}`;

  // Claim
  const claimEl = document.getElementById('card-claim')!;
  if (alien.status === 'found') {
    const claimTime = formatRelativeTime(alien.found_at);
    claimEl.innerHTML = `Encontrado por <strong>${alien.found_by || 'Anónimo'}</strong>${claimTime ? ` · ${claimTime}` : ''}`;
    claimEl.classList.remove('text-gray-400');
  } else if (alien.status === 'hidden') {
    claimEl.innerHTML = `
      <div class="space-y-3">
        <p class="text-gray-400">Alien oculto. Si lo cazas, ¡reclámalo!</p>
      </div>
    `;

    document.getElementById('claim-btn')?.addEventListener('click', async () => {
      const claimerName = prompt('¿Cuál es tu nombre?');
      if (!claimerName || !claimerName.trim()) {
        alert('Por favor, introduce tu nombre');
        return;
      }

      try {
        const response = await fetch('/api/claim-alien', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: alien.id, found_by: claimerName.trim() }),
        });

        const result = await response.json();

        if (result.success) {
          alien.status = 'found';
          alien.found_by = claimerName.trim();
          alien.found_at = result.found_at;

          const claimTime = formatRelativeTime(result.found_at);
          claimEl.innerHTML = `Encontrado por <strong>${alien.found_by}</strong>${claimTime ? ` · ${claimTime}` : ''}`;
          claimEl.classList.remove('text-gray-400');
          alert('¡Felicidades! Has reclamado el alien.');
        } else {
          alert('Error al reclamar el alien: ' + (result.error || 'Error desconocido'));
        }
      } catch (error) {
        console.error('Error claiming alien:', error);
        alert('Error al reclamar el alien. Inténtalo de nuevo.');
      }
    });
  } else {
    claimEl.innerHTML = `<span class="text-gray-400">Especimen no reclamado.</span>`;
  }

  card.classList.remove('hidden');
}
