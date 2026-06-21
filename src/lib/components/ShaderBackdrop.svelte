<script lang="ts">
	// Animated "Balatro" paint-swirl background — ported from the nexus_cards
	// prototype (bg.js), itself a port of the KAPLAY "balatro" shader. Renders a
	// full-screen WebGL quad fixed behind the page. If WebGL is unavailable it
	// leaves the canvas's solid CSS fallback showing; under prefers-reduced-motion
	// it draws a single static frame instead of animating.
	let canvas: HTMLCanvasElement;

	const VERT = `
attribute vec2 a_pos;
varying vec2 v_pos;
void main() {
  v_pos = a_pos;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

	// effect() is the KAPLAY shader verbatim; main() reproduces its frag() wrapper
	const FRAG = `
precision highp float;

uniform float iTime;
varying vec2 v_pos;

#define SPIN_ROTATION -2.0
#define SPIN_SPEED 2.0
#define OFFSET vec2(0.0)
#define COLOUR_1 vec4(0.18, 0.18, 0.20, 1.0)
#define COLOUR_2 vec4(0.02, 0.02, 0.03, 1.0)
#define COLOUR_3 vec4(0.09, 0.09, 0.11, 1.0)
#define CONTRAST 1.0
#define LIGTHING 0.0
#define SPIN_AMOUNT 0.0
#define PIXEL_FILTER 745.0
#define SPIN_EASE 0.5
#define PI 3.14159265359
#define IS_ROTATE false

#define SCALE 2.0
#define DARKEN 0.65
#define SATURATION 0.9

vec4 saturateColor(vec4 color) {
    float gray = 0.2989 * color.r + 0.5870 * color.g + 0.1140 * color.b;
    vec3 saturated = -gray * SATURATION + color.rgb * (1.0 + SATURATION);
    return vec4(clamp(saturated, 0.0, 1.0), color.a);
}

vec4 effect(vec2 screenSize, vec2 screen_coords) {
    float pixel_size = length(screenSize.xy) / PIXEL_FILTER;
    vec2 uv = (floor(screen_coords.xy*(1./pixel_size))*pixel_size - 0.5*screenSize.xy)/length(screenSize.xy) - OFFSET;
    float uv_len = length(uv);

    float speed = (SPIN_ROTATION*SPIN_EASE*0.2);
    if(IS_ROTATE){
       speed = iTime * speed;
    }
    speed += 302.2;
    float new_pixel_angle = atan(uv.y, uv.x) + speed - SPIN_EASE*20.*(1.*SPIN_AMOUNT*uv_len + (1. - 1.*SPIN_AMOUNT));
    vec2 mid = (screenSize.xy/length(screenSize.xy))/2.;
    uv = (vec2((uv_len * cos(new_pixel_angle) + mid.x), (uv_len * sin(new_pixel_angle) + mid.y)) - mid);

    uv *= 30.;
    speed = iTime*(SPIN_SPEED);
    vec2 uv2 = vec2(uv.x+uv.y);

    for(int i=0; i < 3; i++) {
        uv2 += sin(max(uv.x, uv.y)) + uv;
        uv  += 0.5*vec2(cos(5.1123314 + 0.353*uv2.y + speed*0.131121),sin(uv2.x - 0.113*speed));
        uv  -= 1.0*cos(uv.x + uv.y) - 1.0*sin(uv.x*0.711 - uv.y);
    }

    float contrast_mod = (0.25*CONTRAST + 0.5*SPIN_AMOUNT + 1.2);
    float paint_res = min(2., max(0.,length(uv)*(0.035)*contrast_mod));
    float c1p = max(0.,1. - contrast_mod*abs(1.-paint_res));
    float c2p = max(0.,1. - contrast_mod*abs(paint_res));
    float c3p = 1. - min(1., c1p + c2p);
    float light = (LIGTHING - 0.2)*max(c1p*5. - 4., 0.) + LIGTHING*max(c2p*5. - 4., 0.);
    vec4 color = (0.3/CONTRAST)*COLOUR_1 + (1. - 0.3/CONTRAST)*(COLOUR_1*c1p + COLOUR_2*c2p + vec4(c3p*COLOUR_3.rgb, c3p*COLOUR_1.a));

    return saturateColor(color);
}

void main() {
    gl_FragColor = effect(vec2(5.0, 5.0), v_pos * vec2(SCALE)) * vec4(DARKEN, DARKEN, DARKEN, 1.0);
}
`;

	$effect(() => {
		const gl = (canvas.getContext('webgl', {
			antialias: false,
			depth: false,
			alpha: false,
			powerPreference: 'low-power'
		}) || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
		if (!gl) return; // keep the solid CSS fallback

		const compile = (type: number, src: string): WebGLShader | null => {
			const sh = gl.createShader(type);
			if (!sh) return null;
			gl.shaderSource(sh, src);
			gl.compileShader(sh);
			if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
				console.error('bgfx: shader compile error\n', gl.getShaderInfoLog(sh));
				gl.deleteShader(sh);
				return null;
			}
			return sh;
		};

		const vs = compile(gl.VERTEX_SHADER, VERT);
		const fs = compile(gl.FRAGMENT_SHADER, FRAG);
		if (!vs || !fs) return;

		const prog = gl.createProgram();
		if (!prog) return;
		gl.attachShader(prog, vs);
		gl.attachShader(prog, fs);
		gl.linkProgram(prog);
		if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
			console.error('bgfx: program link error\n', gl.getProgramInfoLog(prog));
			return;
		}
		gl.useProgram(prog);

		// full-screen triangle covering the viewport via the clip-space trick
		const buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
		const aPos = gl.getAttribLocation(prog, 'a_pos');
		gl.enableVertexAttribArray(aPos);
		gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

		const uTime = gl.getUniformLocation(prog, 'iTime');

		// cap the backing buffer at 1.5x dpr (matches the KAPLAY pixelDensity) for perf
		const resize = () => {
			const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
			const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
			const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w;
				canvas.height = h;
				gl.viewport(0, 0, w, h);
			}
		};

		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const start = performance.now();
		let raf = 0;
		const render = (now: number) => {
			resize();
			gl.uniform1f(uTime, (now - start) / 1000);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
			if (!reduce) raf = requestAnimationFrame(render);
		};
		raf = requestAnimationFrame(render);

		return () => {
			if (raf) cancelAnimationFrame(raf);
			gl.getExtension('WEBGL_lose_context')?.loseContext();
		};
	});
</script>

<canvas bind:this={canvas} class="bgfx" aria-hidden="true"></canvas>

<style>
	.bgfx {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
		z-index: -1;
		pointer-events: none;
		/* shown only if WebGL is unavailable — matches the vote page's flat shade */
		background: #202020;
	}
</style>
