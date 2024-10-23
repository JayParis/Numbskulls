
precision highp float;

varying vec3 Normal;
varying vec3 Position;
varying vec2 TexCoord;

uniform float uTime;
uniform vec2 uScreenResolution;

// uniform vec3 colour_a;
// uniform vec3 colour_b;

vec2 hash( vec2 p )
{
	p = vec2( dot(p,vec2(127.1,311.7)),
			  dot(p,vec2(269.5,183.3)) );

	return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

float Grad3(float A, float B, float C, float mid, float t){
    float mixA = mix(A, B, clamp(t / mid, 0.0, 1.0));
    return mix(mixA, C, clamp(t - mid, 0.0, 1.0) * (1.0 / (1.0 - mid)));
}

float noise( in vec2 p )
{
    const float K1 = 0.366025404; // (sqrt(3)-1)/2;
    const float K2 = 0.211324865; // (3-sqrt(3))/6;

	vec2 i = floor( p + (p.x+p.y)*K1 );
	
    vec2 a = p - i + (i.x+i.y)*K2;
    vec2 o = (a.x>a.y) ? vec2(1.0,0.0) : vec2(0.0,1.0); //vec2 of = 0.5 + 0.5*vec2(sign(a.x-a.y), sign(a.y-a.x));
    vec2 b = a - o + K2;
	vec2 c = a - 1.0 + 2.0*K2;

    vec3 h = max( 0.5-vec3(dot(a,a), dot(b,b), dot(c,c) ), 0.0 );

	vec3 n = h*h*h*h*vec3( dot(a,hash(i+0.0)), dot(b,hash(i+o)), dot(c,hash(i+1.0)));

    return dot( n, vec3(70.0) );
	
}

float modulo(float x, float y){
    return x - y * floor(x/y);
}

vec2 transformUV(vec2 inUV, vec2 scale, vec2 offset, float rotation){
    vec2 outUV = inUV;
    outUV = outUV * 2.0 - 1.0; // -1 to 1
    outUV *= scale;
    outUV = outUV * 0.5 + 0.5; // 0 to 1
    outUV += offset;
    return outUV;
}

void main()
{
    vec2 uv0 = vec2(TexCoord.x,1.0 - TexCoord.y);

    // float grad = smoothstep(scan_b, scan_a, uv0.y);
    // vec3 composite = mix(colour_b, colour_a, grad);

    float boxScaleMod = (uScreenResolution.y / uScreenResolution.x);
    vec2 scaledUV = transformUV(uv0, vec2(1.0,boxScaleMod) * vec2(0.75,0.75), vec2(.0,.0), 0.);
    float feather = 0.35;
    float qrBox = smoothstep(1.-feather,1.0,scaledUV.x) + smoothstep(feather, 0.0,scaledUV.x) + 
        smoothstep(feather,0.0,scaledUV.y) + smoothstep(1.-feather,1.0,scaledUV.y);
    qrBox = smoothstep(0.0,0.75, 1.-qrBox);

    vec3 rainbow = 0.5 + 0.5*cos((uTime * 3.)+uv0.xyx +vec3(0,2,4));

    float uvWarp = noise(vec2(uv0.x + (uTime * -0.032), uv0.y))*.5 + 1.5;
    uvWarp += (qrBox * 3.0);
    vec2 noiseUV = (uv0 * 1.83) + vec2(uvWarp * 0.6) + (vec2(uTime,uTime) * 0.03);
    float f = noise(vec2(noiseUV.x + (uTime * 0.05), noiseUV.y))*.5 + .5;
    float modMul = ((sin(uTime) + 1.0) / 2.0) * 0.93;
    modMul = 1.0;
    f = modulo(f * (8.0 + modMul), 0.55);
    f = 1.-step(f,0.5);

    float gradient = Grad3(-0.1,1.0,0.0,0.42,uv0.y);
    float darkGradient = f * gradient * 0.1;

    // float fGrad = 1.-gradient;
    float fGrad = gradient;

    vec3 black = vec3(darkGradient,darkGradient,darkGradient);
    vec3 coloured = mix(rainbow * smoothstep(-3.5,2.0,1.-qrBox) * 0.4, vec3(fGrad,fGrad,fGrad), f * (1.-qrBox) * 0.29935);
    vec3 finalColour = mix(black, coloured, 1.0);

	// vec4 ret = vec4(uv0, 0.0, 1.0);

	// vec4 ret = vec4(qrBox, qrBox * 0.2, qrBox * 0.3, 1.0);
	vec4 ret = vec4(finalColour,1.0);


    
    gl_FragColor = ret;
}