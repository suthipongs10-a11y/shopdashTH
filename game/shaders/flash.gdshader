shader_type canvas_item;
// Tints a sprite towards white; used for the hit flash.

uniform float flash : hint_range(0.0, 1.0) = 0.0;

void fragment() {
	COLOR.rgb = mix(COLOR.rgb, vec3(1.0), flash);
}
