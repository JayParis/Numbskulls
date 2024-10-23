precision highp float;

varying vec3 Normal;
varying vec3 Position;
varying vec2 TexCoord;

uniform float uTime;

uniform sampler2D uMainTex;

void main()
{
    vec2 uv0 = vec2(TexCoord.x,TexCoord.y);

    float rainbowMask = texture2D(uMainTex,uv0).a;

    vec3 rainbow = 0.5 + 0.5*cos((uTime * 3.)+uv0.xyx +vec3(0,2,4));


	// vec4 ret = vec4(uTint, rainbowMask * uAlpha);
	vec4 ret = vec4(rainbow * 1.275, rainbowMask);
	// vec4 ret = vec4(rainbow * 0.1, rainbowMask);
	// vec4 ret = vec4(f,f,f,1.0);


    
    gl_FragColor = ret;
}