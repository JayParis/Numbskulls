const assets = {
    // Scripts
    mainScene: new pc.Asset("Main-Scene-Script", "script", { url: "./scripts/main-scene.js", }),

    // Fonts
    PPMoriSemiBold: new pc.Asset("PP-Mori-Semi-Bold-Edited", "font", { url: "./assets/fonts/PPMori-SemiBold-Edited.json", }),
    
    // Textures
    skullTex_1: new pc.Asset("Skull-Tex-1", "texture", { url: "./assets/textures/skull-1.png" }, { type: pc.TEXTURETYPE_RGBP, mipmaps: false } ),
    skullTex_2: new pc.Asset("Skull-Tex-2", "texture", { url: "./assets/textures/skull-2.png" }, { type: pc.TEXTURETYPE_RGBP, mipmaps: false } ),
    skullTex_3: new pc.Asset("Skull-Tex-3", "texture", { url: "./assets/textures/skull-3.png" }, { type: pc.TEXTURETYPE_RGBP, mipmaps: false } ),
    skullTex_4: new pc.Asset("Skull-Tex-4", "texture", { url: "./assets/textures/skull-4.png" }, { type: pc.TEXTURETYPE_RGBP, mipmaps: false } ),
    skullTex_5: new pc.Asset("Skull-Tex-5", "texture", { url: "./assets/textures/skull-5.png" }, { type: pc.TEXTURETYPE_RGBP, mipmaps: false } ),
    skullTex_6: new pc.Asset("Skull-Tex-6", "texture", { url: "./assets/textures/skull-6.png" }, { type: pc.TEXTURETYPE_RGBP, mipmaps: false } ),
    skullTex_7: new pc.Asset("Skull-Tex-7", "texture", { url: "./assets/textures/skull-7.png" }, { type: pc.TEXTURETYPE_RGBP, mipmaps: false } ),
    skullTex_8: new pc.Asset("Skull-Tex-8", "texture", { url: "./assets/textures/skull-8.png" }, { type: pc.TEXTURETYPE_RGBP, mipmaps: false } ),
    
    // Models
    // heartGLB: new pc.Asset("Heart", "container", { url: "./assets/models/heart.glb", }),
    // spellingUI: new pc.Asset("Spelling-UI", "container", { url: "./assets/models/spelling-ui.glb", }),
    // opponentUI: new pc.Asset("Opponent-UI", "container", { url: "./assets/models/opponent-ui.glb", }),

    // Shaders
    backgroundVS: new pc.Asset("Background-VS", "shader", { url: "./assets/shaders/background-vs.glsl", }),
    backgroundFS: new pc.Asset("Background-FS", "shader", { url: "./assets/shaders/background-fs.glsl", }),
    skullVS: new pc.Asset("Skull-VS", "shader", { url: "./assets/shaders/skull-vs.glsl", }),
    skullFS: new pc.Asset("Skull-FS", "shader", { url: "./assets/shaders/skull-fs.glsl", }),
    // heartVS: new pc.Asset("Heart-VS", "shader", { url: "./assets/shaders/heart-vs.glsl", }),
    // heartFS: new pc.Asset("Heart-FS", "shader", { url: "./assets/shaders/heart-fs.glsl", }),
    // heartOutlineVS: new pc.Asset("Heart-Outline-VS", "shader", { url: "./assets/shaders/heart-outline-vs.glsl", }),
    // heartOutlineFS: new pc.Asset("Heart-Outline-FS", "shader", { url: "./assets/shaders/heart-outline-fs.glsl", }),
    // gradientUIVS: new pc.Asset("Gradient-UI-VS", "shader", { url: "./assets/shaders/gradient-ui-vs.glsl", }),
    // gradientUIFS: new pc.Asset("Gradient-UI-FS", "shader", { url: "./assets/shaders/gradient-ui-fs.glsl", }),
};

// Helpers ------------


function clamp1(number, min, max){
	return Math.max(min, Math.min(number, max));
}

function lerp1(a, b, t){
	return a + (b - a) * t;
}

function mod01(x, y) {
    return x - y * Math.floor(x/y);
}

function sfc32(a, b, c, d){
    return function() {
        a |= 0; b |= 0; c |= 0; d |= 0;
        let t = (a + b | 0) + d | 0;
        d = d + 1 | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    }
}
const seedgen = () => (Math.random()*2**32)>>>0;
const getRand = sfc32(seedgen(), seedgen(), seedgen(), seedgen());

function centeredList(index, total, spacing, pivot, isHorizontal=true){
    const linePos = (index * spacing) - ((total-1) * spacing * 0.5);
    const outArray = isHorizontal ? [pivot[0] + linePos, pivot[1], pivot[2]] : [pivot[0], pivot[1] + linePos, pivot[2]];
    return outArray;
}

// Curves

function evaluateCurve(id, tVal){
	var ret = 0;
	switch (id) {
		case 0:
			ret = lerp1(0,1,tVal);
			break;
		case 1:
            ret = c_elasticOut(tVal);
			break;
		case 2:
			break;
	}
	return ret;
}

function bezier(t, initial, p1, p2, final){
    return (
        (1 - t) * (1 - t) * (1 - t) * initial +
        3 * (1 - t) * (1 - t) * t * p1 +
        3 * (1 - t) * t * t * p2 +
        t * t * t * final
    );
}

function c_elasticOut (amount) {
    if (amount === 0) {
        return 0;
    }
    if (amount === 1) {
        return 1;
    }
    return Math.pow(2, -10 * amount) * Math.sin((amount - 0.1) * 5 * Math.PI) + 1;
}