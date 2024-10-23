precision highp float;

attribute vec3 vVertex;
attribute vec3 vNormal;
attribute vec2 vTexCoord;

varying vec2 TexCoord;
varying vec3 Position;
varying vec3 Normal;

uniform mat4 matrix_model;
uniform mat4 matrix_viewProjection;
uniform mat3 matrix_normal;


void main()
{
    TexCoord = vTexCoord;

    vec4 pt = vec4(vVertex,1.0);

    Normal = normalize(matrix_normal * vNormal);
    Position = vec3(matrix_model * pt);
    gl_Position = matrix_viewProjection * matrix_model  * pt;
}