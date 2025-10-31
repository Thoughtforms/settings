// This script runs automatically when you navigate to a URL with `?handsfree`
// It initializes Handsfree.js with browser plugins and custom gesture controls.
//
// The 'params' variable is available and contains the parsed URL query parameters.
// The 'editor' variable is the instance for the current pane.

(async () => {
  if (params && typeof params.handsfree !== 'undefined') {
    if (typeof Handsfree === 'undefined') {
      console.error('[Handsfree Autoloader] Handsfree.js library is not available. Make sure it is included in index.html');
      return;
    }

    console.log('[Handsfree Autoloader] Starting Handsfree.js with custom gestures...');

    try {
      const handsfree = new Handsfree({
        hands: true
      });

      // --- Gesture Definitions ---
      handsfree.useGesture({"name": "pointLeft", "algorithm": "fingerpose", "models": "hands", "confidence": 7.5, "description": [["addCurl","Thumb","NoCurl",1],["addCurl","Thumb","HalfCurl",0.11],["addDirection","Thumb","HorizontalRight",1],["addDirection","Thumb","DiagonalDownRight",0.66],["addCurl","Index","NoCurl",1],["addDirection","Index","HorizontalRight",1],["addDirection","Index","DiagonalDownRight",0.04],["addDirection","Index","DiagonalUpRight",0.20],["addCurl","Middle","NoCurl",1],["addDirection","Middle","HorizontalRight",1],["addDirection","Middle","DiagonalUpRight",0.11],["addCurl","Ring","FullCurl",1],["addCurl","Ring","NoCurl",0.26],["addCurl","Ring","HalfCurl",0.04],["addDirection","Ring","HorizontalRight",1],["addDirection","Ring","DiagonalUpRight",0.03],["addDirection","Ring","DiagonalDownRight",0.11],["addCurl","Pinky","FullCurl",1],["addDirection","Pinky","HorizontalRight",1],["addDirection","Pinky","DiagonalDownRight",0.57],["setWeight","Index",2],["setWeight","Middle",2]]});
      handsfree.useGesture({"name": "pointDown", "algorithm": "fingerpose", "models": "hands", "confidence": 7.5, "description": [["addCurl","Thumb","HalfCurl",0.03],["addCurl","Thumb","NoCurl",1],["addDirection","Thumb","DiagonalDownRight",0.91],["addDirection","Thumb","VerticalDown",0.58],["addDirection","Thumb","DiagonalDownLeft",1],["addCurl","Index","NoCurl",1],["addCurl","Index","HalfCurl",0.03],["addDirection","Index","DiagonalDownRight",1],["addDirection","Index","VerticalDown",0.72],["addDirection","Index","DiagonalDownLeft",1],["addCurl","Middle","NoCurl",1],["addDirection","Middle","DiagonalDownRight",1],["addDirection","Middle","VerticalDown",0.75],["addDirection","Middle","DiagonalDownLeft",0.75],["addCurl","Ring","FullCurl",1],["addCurl","Ring","HalfCurl",0.03],["addCurl","Ring","NoCurl",0.03],["addDirection","Ring","DiagonalDownRight",1],["addDirection","Ring","VerticalDown",0.46],["addDirection","Ring","DiagonalDownLeft",0.84],["addCurl","Pinky","FullCurl",1],["addCurl","Pinky","HalfCurl",0.03],["addCurl","Pinky","NoCurl",0.03],["addDirection","Pinky","DiagonalDownRight",0.53],["addDirection","Pinky","VerticalDown",0.69],["addDirection","Pinky","DiagonalDownLeft",1],["addDirection","Pinky","HorizontalLeft",0.07],["setWeight","Index",2],["setWeight","Middle",2]]});
      handsfree.useGesture({"name": "close", "algorithm": "fingerpose", "models": "hands", "confidence": 7.5, "description": [["addCurl","Thumb","HalfCurl",1],["addDirection","Thumb","DiagonalUpLeft",0.72],["addDirection","Thumb","VerticalUp",1],["addDirection","Thumb","DiagonalUpRight",1],["addCurl","Index","FullCurl",1],["addDirection","Index","DiagonalUpRight",1],["addDirection","Index","HorizontalRight",0.2],["addCurl","Middle","FullCurl",1],["addDirection","Middle","VerticalUp",0.87],["addDirection","Middle","DiagonalUpRight",1],["addCurl","Ring","FullCurl",1],["addDirection","Ring","DiagonalUpLeft",0.75],["addDirection","Ring","VerticalUp",0.75],["addDirection","Ring","DiagonalUpRight",1],["addCurl","Pinky","FullCurl",1],["addDirection","Pinky","DiagonalUpLeft",1],["addDirection","Pinky","VerticalUp",0.6],["addDirection","Pinky","DiagonalUpRight",0.4]]});

      // --- Unified Gesture Controller Plugin ---
      handsfree.use('gestureController', {
        // Plugin state
        lastActionTime: 0,
        actionCooldown: 1000,
        draggedWindow: null,
        dragOffset: { x: 0, y: 0 },
        activeHand: -1,

        onFrame({ hands }) {
          if (!hands || !hands.landmarks || !hands.pinchState || !hands.pointer) return;

          const gestures = handsfree.model.hands.getGesture();
          const now = Date.now();

          // --- 1. Handle High-Level System Gestures (Highest Priority) ---
          if (now - this.lastActionTime > this.actionCooldown) {
            for (let i = 0; i < gestures.length; i++) {
              const gesture = gestures[i];
              if (gesture?.name) {
                let actionTaken = false;
                switch (gesture.name) {
                  case 'pointLeft':
                    window.thoughtform.ui.toggleSidebar?.();
                    actionTaken = true;
                    break;
                  case 'pointDown':
                    window.thoughtform.ui.toggleDevtools?.();
                    actionTaken = true;
                    break;
                  case 'close':
                    const windows = Array.from(document.querySelectorAll('.preview-window.visible'));
                    if (windows.length === 0) {
                      const url = `/${editor.gitClient.gardenName}#/home?windowed=true`;
                      window.thoughtform.ui.openWindow(url, window.innerWidth / 2, window.innerHeight / 2);
                    } else {
                      const activeWindow = windows.sort((a, b) => parseInt(b.style.zIndex) - parseInt(a.style.zIndex))[0];
                      activeWindow.querySelector('.preview-close-btn')?.click();
                    }
                    actionTaken = true;
                    break;
                }
                if (actionTaken) {
                  console.log(`[Handsfree Plugin] Triggered action for gesture: "${gesture.name}"`);
                  this.lastActionTime = now;
                  return; 
                }
              }
            }
          }
          
          // --- 2. Handle Pinch-to-Drag Window ---
          if (this.draggedWindow && this.activeHand !== -1) {
            const pinchState = hands.pinchState[this.activeHand][0];
            const pointer = hands.pointer[this.activeHand];
            if (pinchState === 'held' && pointer?.isVisible) {
              this.draggedWindow.style.left = `${pointer.x - this.dragOffset.x}px`;
              this.draggedWindow.style.top = `${pointer.y - this.dragOffset.y}px`;
            } else {
              this.draggedWindow.querySelector('iframe').style.pointerEvents = 'auto';
              this.draggedWindow.classList.remove('is-dragging');
              this.draggedWindow = null;
              this.activeHand = -1;
            }
            return;
          }

          for (let i = 0; i < hands.pinchState.length; i++) {
            if (gestures[i]?.name === 'close') continue;
            
            const pinchState = hands.pinchState[i][0];
            const pointer = hands.pointer[i];

            if (pinchState === 'start' && pointer?.isVisible) {
              const $el = document.elementFromPoint(pointer.x, pointer.y);
              const $window = $el?.closest('.preview-window');

              if ($window) {
                this.draggedWindow = $window;
                this.activeHand = i;
                const rect = this.draggedWindow.getBoundingClientRect();
                this.dragOffset.x = pointer.x - rect.left;
                this.dragOffset.y = pointer.y - rect.top;
                
                const allWindows = Array.from(document.querySelectorAll('.preview-window.visible'));
                const maxZ = Math.max(1000, ...allWindows.map(w => parseInt(w.style.zIndex) || 0));
                this.draggedWindow.style.zIndex = maxZ + 1;

                this.draggedWindow.querySelector('iframe').style.pointerEvents = 'none';
                this.draggedWindow.classList.add('is-dragging');
                this.lastActionTime = now;
                return;
              }
            }
          }

          // --- 3. Handle Pinch-to-Click (Lowest Priority) ---
          if (now - this.lastActionTime > this.actionCooldown) {
            for (let i = 0; i < hands.pinchState.length; i++) {
              if (gestures[i]?.name === 'close') continue;
              
              const pinchState = hands.pinchState[i][0];
              if (pinchState === 'start') {
                const pointer = hands.pointer[i];
                if (!pointer || !pointer.isVisible) continue;

                let targetElement = document.elementFromPoint(pointer.x, pointer.y);
                let eventX = pointer.x, eventY = pointer.y;

                if (targetElement?.tagName === 'IFRAME') {
                  const rect = targetElement.getBoundingClientRect();
                  eventX = pointer.x - rect.left;
                  eventY = pointer.y - rect.top;
                  targetElement = targetElement.contentWindow.document.elementFromPoint(eventX, eventY);
                }

                if (targetElement) {
                  console.log('[Handsfree Plugin] Pinch-to-click on:', targetElement);
                  const eventOpts = { bubbles: true, cancelable: true, clientX: eventX, clientY: eventY };
                  targetElement.dispatchEvent(new MouseEvent('mousedown', eventOpts));
                  targetElement.dispatchEvent(new MouseEvent('mouseup', eventOpts));
                  targetElement.dispatchEvent(new MouseEvent('click', eventOpts));
                  this.lastActionTime = now;
                  return;
                }
              }
            }
          }
        }
      });

      // Enable the default set of browser interaction plugins
      handsfree.enablePlugins('browser');

      // Start the handsfree instance.
      handsfree.start();

      // Make it accessible on the window object for easy debugging.
      window.handsfree = handsfree;
      console.log('[Handsfree Autoloader] Handsfree.js started successfully with all custom gestures and plugins.');

    } catch (e) {
      console.error('[Handsfree Autoloader] Failed to start Handsfree.js:', e);
    }
  }
})();