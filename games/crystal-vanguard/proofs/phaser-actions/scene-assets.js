((app) => {
  'use strict';

  const { CELL, REGISTRATION, ACTIONS, DIRS, median } = app;
  const ProofScene = app.ProofScene;

  Object.assign(ProofScene.prototype, {
    analyzeAssets() {
      const profiles = {};
      const actionMetrics = {};
      this.assetWarnings = [];
      this.assetReport = [];

      for (const [actionKey, action] of Object.entries(ACTIONS)) {
        const expectedWidth = action.frames * CELL;
        const expectedHeight = DIRS.length * CELL;
        const texture = this.textures.get(action.texture);
        const image = texture.getSourceImage?.(0) || texture.source?.[0]?.image;
        const dimensionsOk = image?.width === expectedWidth && image?.height === expectedHeight;

        if (!dimensionsOk) {
          this.assetWarnings.push(
            `${actionKey}: 預期 ${expectedWidth}×${expectedHeight}，實際 ${image?.width ?? '?'}×${image?.height ?? '?'}`
          );
        }

        const fallbackFrames = {};
        for (let index = 0; index < action.frames * DIRS.length; index += 1) {
          fallbackFrames[index] = {
            pivotX: REGISTRATION.defaultX,
            pivotY: REGISTRATION.defaultY,
            bbox: null
          };
        }
        profiles[actionKey] = { frames: fallbackFrames, scale: 1 };

        if (!dimensionsOk || !image) {
          actionMetrics[actionKey] = { restHeight: 0, maxFootDrift: 0, emptyFrames: 0, dimensionsOk };
          continue;
        }

        try {
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          context.drawImage(image, 0, 0);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const analyzed = this.analyzeSheetPixels(imageData, action);
          profiles[actionKey].frames = analyzed.frames;
          actionMetrics[actionKey] = { ...analyzed.metrics, dimensionsOk };
        } catch (error) {
          this.assetWarnings.push(`${actionKey}: 瀏覽器禁止讀取 alpha，改用固定錨點 48,82`);
          actionMetrics[actionKey] = { restHeight: 0, maxFootDrift: 0, emptyFrames: 0, dimensionsOk };
          console.warn(`Asset alpha analysis failed for ${actionKey}`, error);
        }
      }

      const referenceHeight = actionMetrics.idle?.restHeight || 0;
      for (const [actionKey, metrics] of Object.entries(actionMetrics)) {
        let scale = 1;
        if (referenceHeight > 0 && metrics.restHeight > 0) {
          const rawScale = referenceHeight / metrics.restHeight;
          scale = Phaser.Math.Clamp(
            rawScale,
            1 - REGISTRATION.maxScaleCorrection,
            1 + REGISTRATION.maxScaleCorrection
          );
          if (Math.abs(rawScale - 1) > 0.035) {
            this.assetWarnings.push(`${actionKey}: 首幀角色比例差 ${(Math.abs(rawScale - 1) * 100).toFixed(1)}%`);
          }
        }
        profiles[actionKey].scale = scale;
        if (metrics.maxFootDrift > 2) {
          this.assetWarnings.push(`${actionKey}: 腳底基準漂移最高 ${metrics.maxFootDrift}px`);
        }
        if (metrics.emptyFrames > 0) {
          this.assetWarnings.push(`${actionKey}: ${metrics.emptyFrames} 個空白 frame`);
        }
        this.assetReport.push({
          action: actionKey,
          size: `${ACTIONS[actionKey].frames * CELL}×${DIRS.length * CELL}`,
          restHeight: metrics.restHeight || '-',
          footDriftPx: metrics.maxFootDrift,
          runtimeScale: Number(scale.toFixed(3)),
          emptyFrames: metrics.emptyFrames,
          dimensionsOk: metrics.dimensionsOk
        });
      }

      console.table(this.assetReport);
      if (this.assetWarnings.length) console.warn('Sprite asset QA:', this.assetWarnings);
      return profiles;
    },

    analyzeSheetPixels(imageData, action) {
      const frames = {};
      const restHeights = [];
      const footDrifts = [];
      let emptyFrames = 0;
      const rowRawProfiles = [];

      for (const direction of DIRS) {
        const rawProfiles = [];
        for (let column = 0; column < action.frames; column += 1) {
          const frameIndex = direction.row * action.frames + column;
          const raw = this.analyzeFramePixels(imageData, column, direction.row);
          rawProfiles.push({ frameIndex, ...raw });
          if (!raw.bbox) emptyFrames += 1;
          if (column === 0 && raw.coreHeight > 0) restHeights.push(raw.coreHeight);
        }
        rowRawProfiles.push(rawProfiles);
      }

      for (const rawProfiles of rowRawProfiles) {
        const valid = rawProfiles.filter(profile => profile.bbox);
        const reference = action.repeat === -1 ? null : valid[0];
        const medianX = reference?.pivotX || median(valid.map(profile => profile.pivotX)) || REGISTRATION.defaultX;
        const medianY = reference?.pivotY || median(valid.map(profile => profile.pivotY)) || REGISTRATION.defaultY;
        const correctionLimit = action.stabilizePx ?? 0;
        const rawBottoms = valid.map(profile => profile.pivotY);
        if (rawBottoms.length) footDrifts.push(Math.max(...rawBottoms) - Math.min(...rawBottoms));

        for (const profile of rawProfiles) {
          frames[profile.frameIndex] = {
            pivotX: Phaser.Math.Clamp(
              profile.pivotX || medianX,
              medianX - correctionLimit,
              medianX + correctionLimit
            ),
            pivotY: Phaser.Math.Clamp(
              profile.pivotY || medianY,
              medianY - correctionLimit,
              medianY + correctionLimit
            ),
            bbox: profile.bbox
          };
        }
      }

      return {
        frames,
        metrics: {
          restHeight: Math.round(median(restHeights)),
          maxFootDrift: Math.round(Math.max(0, ...footDrifts)),
          emptyFrames
        }
      };
    },

    analyzeFramePixels(imageData, column, row) {
      const { data, width } = imageData;
      const frameLeft = column * CELL;
      const frameTop = row * CELL;
      const coreLeft = Math.floor(CELL * REGISTRATION.coreLeft);
      const coreRight = Math.ceil(CELL * REGISTRATION.coreRight);
      let minX = CELL;
      let minY = CELL;
      let maxX = -1;
      let maxY = -1;
      let coreMinY = CELL;
      let coreMaxY = -1;
      let footY = -1;

      for (let y = 0; y < CELL; y += 1) {
        for (let x = 0; x < CELL; x += 1) {
          const alpha = data[((frameTop + y) * width + frameLeft + x) * 4 + 3];
          if (alpha < REGISTRATION.alphaThreshold) continue;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          if (x >= coreLeft && x <= coreRight) {
            coreMinY = Math.min(coreMinY, y);
            coreMaxY = Math.max(coreMaxY, y);
            footY = Math.max(footY, y);
          }
        }
      }

      if (maxX < 0) {
        return {
          pivotX: REGISTRATION.defaultX,
          pivotY: REGISTRATION.defaultY,
          bbox: null,
          coreHeight: 0
        };
      }

      if (footY < 0) footY = maxY;
      let footXTotal = 0;
      let footPixelCount = 0;
      const footTop = Math.max(0, footY - 3);
      for (let y = footTop; y <= footY; y += 1) {
        for (let x = coreLeft; x <= coreRight; x += 1) {
          const alpha = data[((frameTop + y) * width + frameLeft + x) * 4 + 3];
          if (alpha < REGISTRATION.alphaThreshold) continue;
          footXTotal += x;
          footPixelCount += 1;
        }
      }

      return {
        pivotX: footPixelCount ? footXTotal / footPixelCount : (minX + maxX + 1) / 2,
        pivotY: footY + 1,
        bbox: { left: minX, top: minY, right: maxX + 1, bottom: maxY + 1 },
        coreHeight: coreMaxY >= coreMinY ? coreMaxY - coreMinY + 1 : maxY - minY + 1
      };
    },

    refreshAssetStatus() {
      const assetStatus = document.querySelector('#asset-status');
      const okCount = this.assetReport.filter(row => row.emptyFrames === 0 && row.dimensionsOk).length;
      const scaleValues = this.assetReport.map(row => Math.abs(row.runtimeScale - 1));
      const maxScale = Math.max(0, ...scaleValues) * 100;
      const maxDrift = Math.max(0, ...this.assetReport.map(row => row.footDriftPx));
      assetStatus.classList.toggle('warn', this.assetWarnings.length > 0);
      assetStatus.classList.toggle('error', okCount !== Object.keys(ACTIONS).length);
      assetStatus.textContent = this.assetWarnings.length
        ? `素材 QA：${this.assetWarnings.length} 項警告 · max 腳底漂移 ${maxDrift}px · runtime scale Δ${maxScale.toFixed(1)}%（詳見 console）`
        : `素材 QA：6/6 sheet 通過 · 腳底錨點自動校正 · runtime scale Δ${maxScale.toFixed(1)}%`;
    }
  });
})(window.CVProof);
