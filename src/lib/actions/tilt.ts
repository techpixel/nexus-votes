// Ambient 3D card tilt, ported from the nexus_cards prototype (Card.update).
// Each card gets a desynced sine sway on the X/Y axes so neighbours never
// move in lockstep; the live angle is eased toward that target every frame.
// The element must sit inside a parent that owns the `perspective` so the
// 3D rotation reads as depth rather than a flat skew.

const AMBIENT_TILT = 8; // idle pitch/yaw sway amplitude (deg), matches the prototype
const Z_SWAY = 2.5; // very slight roll on the z axis (deg)
const TILT_SPEED = 260; // approach speed (deg/sec)

// linear ease toward `target`, capped at `maxStep` this frame
const approach = (cur: number, target: number, maxStep: number): number => {
	const d = target - cur;
	return Math.abs(d) <= maxStep ? target : cur + Math.sign(d) * maxStep;
};

export function tilt(node: HTMLElement, amplitude: number = AMBIENT_TILT) {
	// per-card randomisation so the row looks hand-dealt, not synchronised
	const phaseY = Math.random() * Math.PI * 2;
	const phaseX = Math.random() * Math.PI * 2;
	const phaseZ = Math.random() * Math.PI * 2;
	const speed = 0.8 + Math.random() * 1.0;
	const ampScale = 0.7 + Math.random() * 0.8;
	const offY = (Math.random() * 2 - 1) * 4;
	const offX = (Math.random() * 2 - 1) * 3;
	// random resting roll on the z axis (−3°…3°) so cards sit hand-dealt
	const baseZ = (Math.random() * 2 - 1) * 3;

	let tiltX = 0;
	let tiltY = 0;
	let tiltZ = baseZ;
	let last = performance.now();
	let raf = 0;

	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	function frame(now: number) {
		const dt = Math.min((now - last) / 1000, 0.05);
		last = now;
		const t = now / 1000;
		const amp = amplitude * ampScale;
		const ty = offY + Math.sin(t * speed + phaseY) * amp;
		const tx = offX + Math.sin(t * speed * 0.75 + phaseX) * amp * 0.6;
		// slow, slight roll on the z axis — a lazy rock around the resting baseZ
		const tz = baseZ + Math.sin(t * speed * 0.5 + phaseZ) * Z_SWAY * ampScale;
		const ts = TILT_SPEED * dt;
		tiltY = approach(tiltY, ty, ts);
		tiltX = approach(tiltX, tx, ts);
		tiltZ = approach(tiltZ, tz, ts);
		node.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) rotateZ(${tiltZ}deg)`;
		raf = requestAnimationFrame(frame);
	}

	if (reduce) {
		// no animation, but keep the random resting roll
		node.style.transform = `rotateZ(${baseZ}deg)`;
	} else {
		raf = requestAnimationFrame(frame);
	}

	return {
		destroy() {
			if (raf) cancelAnimationFrame(raf);
		}
	};
}
