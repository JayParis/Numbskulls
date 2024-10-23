precision highp float;

varying vec3 Normal;
varying vec3 Position;
varying vec2 TexCoord;

uniform sampler2D uMainTex;
uniform vec3 uTint;
uniform float uAlpha;

void main()
{
    vec2 uv0 = vec2(TexCoord.x,TexCoord.y);

    float skullMask = texture2D(uMainTex,uv0).r;

	vec4 ret = vec4(uTint, skullMask * uAlpha);
	// vec4 ret = vec4(col, 1.0);
	// vec4 ret = vec4(f,f,f,1.0);


    
    gl_FragColor = ret;
}