// Ask for camera permission early (helps browsers prompt nicely)
navigator.mediaDevices.getUserMedia({ video: true })
  .then((stream) => stream.getTracks().forEach(track => track.stop()))
  .catch((err) => {
    alert("Camera access denied. Please allow camera permissions.");
    console.error("Camera error:", err);
  });

AFRAME.registerComponent('click-to-start-animation', {
  init: function () {
    const anchor = this.el;

    // ===== DOM =====
    const overlay = document.getElementById('overlay');
    const question = document.getElementById('question');
    const clearButton = document.getElementById('clear-button');

    const overlay2 = document.getElementById('overlay2');
    const clearButton2 = document.getElementById('clear-button-2');
    const addSignButton = document.getElementById('add-sign-button');

    const noteWetFloor = document.getElementById('note-wetfloor');

    // ===== MODELS =====
    const workerTripping   = document.getElementById('workerTripping');
    const workerSafe       = document.getElementById('workerSafe');
    const workerWalkingSafe= document.getElementById('workerWalkingSafe');
    const workerSlipping   = document.getElementById('workerSlipping');
    const workerSlipping2  = document.getElementById('workerSlipping2');
    const workerSafeSign   = document.getElementById('workerSafeSign');
    const pallet           = document.getElementById('palletModel');

    // ===== STATE =====
    let animationStarted = false;
    let questionShown = false;
    let scene2Started = false;

    // Track timers & one-off listeners so we can cancel them on reset
    const timers = new Set();
    const addTimer = (id) => timers.add(id);
    const clearTimers = () => { for (const t of timers) clearTimeout(t); timers.clear(); };

    // To remove the “startExperience” listener on reset (if target is lost before first tap)
    let startExperienceFn = null;

    // Helpers
    const hideAllModels = () => {
      [workerTripping, workerSafe, workerWalkingSafe, workerSlipping, workerSlipping2, workerSafeSign, pallet]
        .forEach(el => el && el.setAttribute('visible', false));
    };
    const hideAllUI = () => {
      [overlay, question, overlay2, noteWetFloor, clearButton, clearButton2, addSignButton]
        .forEach(el => el && (el.style.display = 'none'));
    };
    const stopAllMixers = () => {
      [workerTripping, workerWalkingSafe, workerSlipping, workerSlipping2, workerSafeSign].forEach(el => {
        const mixer = el?.components?.['animation-mixer']?.mixer;
        if (mixer) mixer.stopAllAction();
      });
    };

    // Safety: remove lingering animation-finished listener for slip2
    const removeSlip2Finished = () => {
      workerSlipping2?.removeEventListener('animation-finished', onSlip2Finished);
    };

    // Defined later but referenced here
    let onSlip2Finished = () => {};

    // ===== PHASE 1 =====
    workerTripping.addEventListener('model-loaded', () => {
      const mesh = workerTripping.getObject3D('mesh');
      const clips = mesh?.animations;
      const mixer = workerTripping.components['animation-mixer']?.mixer;
      if (!clips || !mixer) {
        console.warn('WorkerTripping missing animation');
        return;
      }

      const action = mixer.clipAction(clips[0]);
      const speed = 0.5;
      const duration = clips[0].duration;

      anchor.addEventListener('targetFound', () => {
        // Always start clean on each reacquire
        resetAll();

        if (animationStarted) return;
        overlay.style.display = 'flex';

        startExperienceFn = () => {
          overlay.style.display = 'none';
          workerTripping.setAttribute('visible', true);

          action.reset();
          action.setLoop(THREE.LoopOnce);
          action.clampWhenFinished = true;
          action.setEffectiveTimeScale(speed);
          action.play();

          // show the question after animation (speed-adjusted) + 2s
          const t = setTimeout(() => {
            question.style.display = 'flex';
            questionShown = true;
          }, duration * (1 / speed) * 1000 + 2000);
          addTimer(t);

          document.body.removeEventListener('click', startExperienceFn);
          document.body.removeEventListener('touchend', startExperienceFn);
          startExperienceFn = null;
        };

        document.body.addEventListener('click', startExperienceFn);
        document.body.addEventListener('touchend', startExperienceFn);
        animationStarted = true;
      });

      anchor.addEventListener('targetLost', () => {
        resetAll();
      });
    });

    // ===== PHASE 1 -> Tap to continue =====
    const onBodyTapPhase1 = () => {
      if (questionShown) {
        question.style.display = 'none';
        workerTripping.setAttribute('visible', false);
        workerSafe.setAttribute('visible', true);
        pallet.setAttribute('visible', true);
        clearButton.style.display = 'block';
        questionShown = false;
      }
    };
    document.body.addEventListener('click', onBodyTapPhase1);
    document.body.addEventListener('touchend', onBodyTapPhase1);

    // ===== Clear Path (PHASE 1) =====
    clearButton.addEventListener('click', () => {
      clearButton.style.display = 'none';
      workerSafe.setAttribute('visible', false);
      pallet.setAttribute('visible', false);
      workerWalkingSafe.setAttribute('visible', true);

      const mesh = workerWalkingSafe.getObject3D('mesh');
      const clips = mesh?.animations;
      const mixer = workerWalkingSafe.components['animation-mixer']?.mixer;
      if (!clips || !mixer) {
        console.warn('WorkerWalkingSafe missing animation');
        return;
      }

      const action = mixer.clipAction(clips[0]);
      action.reset();
      action.setLoop(THREE.LoopOnce);
      action.clampWhenFinished = true;
      action.setEffectiveTimeScale(0.5);
      action.play();

      const t = setTimeout(() => {
        overlay2.style.display = 'flex';
        scene2Started = true;
      }, clips[0].duration * 2000 + 2000);
      addTimer(t);
    });

    // ===== PHASE 2 START =====
    const onBodyTapPhase2 = () => {
      if (scene2Started) {
        overlay2.style.display = 'none';
        workerWalkingSafe.setAttribute('visible', false);
        workerSlipping.setAttribute('visible', true);

        const mesh = workerSlipping.getObject3D('mesh');
        const clips = mesh?.animations;
        const mixer = workerSlipping.components['animation-mixer']?.mixer;
        if (!clips || !mixer) {
          console.warn('WorkerSlipping missing animation');
          return;
        }

        const action = mixer.clipAction(clips[0]);
        action.reset();
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
        action.setEffectiveTimeScale(0.5);
        action.play();

        const t = setTimeout(() => {
          clearButton2.style.display = 'block';
        }, clips[0].duration * 2000 + 2000);
        addTimer(t);

        scene2Started = false;
      }
    };
    document.body.addEventListener('click', onBodyTapPhase2);
    document.body.addEventListener('touchend', onBodyTapPhase2);

    // ===== Clear Path (PHASE 2) =====
    clearButton2.addEventListener('click', () => {
      clearButton2.style.display = 'none';
      workerSlipping.setAttribute('visible', false);
      workerSlipping2.setAttribute('visible', true);

      const mesh = workerSlipping2.getObject3D('mesh');
      const clips = mesh?.animations;
      const mixer = workerSlipping2.components['animation-mixer']?.mixer;
      if (!clips || !mixer) {
        console.warn('WorkerSlipping2 missing animation');
        return;
      }

      const action = mixer.clipAction(clips[0]);
      action.reset();
      action.setLoop(THREE.LoopOnce);
      action.clampWhenFinished = true;
      action.setEffectiveTimeScale(0.5);
      action.play();

      // Show "wet floor" note AFTER animation ends, then show Add Sign
      onSlip2Finished = () => {
        addSignButton.style.display = 'none';
        noteWetFloor.style.display = 'flex';

        const closeNote = () => {
          noteWetFloor.style.display = 'none';
          addSignButton.style.display = 'block';
          noteWetFloor.removeEventListener('click', closeNote);
          noteWetFloor.removeEventListener('touchend', closeNote);
        };
        noteWetFloor.addEventListener('click', closeNote, { once: true });
        noteWetFloor.addEventListener('touchend', closeNote, { once: true });

        workerSlipping2.removeEventListener('animation-finished', onSlip2Finished);
      };

      workerSlipping2.addEventListener('animation-finished', onSlip2Finished);
    });

    // ===== Final: Add Sign =====
    addSignButton.addEventListener('click', () => {
      addSignButton.style.display = 'none';
      hideAllModels();

      workerSafeSign.setAttribute('visible', true);

      const mesh = workerSafeSign.getObject3D('mesh');
      const clips = mesh?.animations;
      const mixer = workerSafeSign.components['animation-mixer']?.mixer;
      if (!clips || !mixer) {
        console.warn('WorkerSafeSign missing animation');
        return;
      }

      const action = mixer.clipAction(clips[0]);
      action.reset();
      action.setLoop(THREE.LoopOnce);
      action.clampWhenFinished = true;
      action.play();
    });

    // ===== RESET EVERYTHING on targetLost (or before a new run) =====
    const resetAll = () => {
      // 1) Kill timers to prevent late UI/model changes
      clearTimers();

      // 2) Remove pending startExperience listener if it exists
      if (startExperienceFn) {
        document.body.removeEventListener('click', startExperienceFn);
        document.body.removeEventListener('touchend', startExperienceFn);
        startExperienceFn = null;
      }

      // 3) Remove one-off animation listeners
      removeSlip2Finished();

      // 4) Stop any running animations
      stopAllMixers();

      // 5) Hide EVERYTHING
      hideAllUI();
      hideAllModels();

      // 6) Reset state flags so next targetFound is a fresh run
      animationStarted = false;
      questionShown = false;
      scene2Started = false;
    };
  }
});
