shader_type canvas_item;
// Tints a sprite towards a solid colour: white for the hit flash, the aura colour while
// a monster dissolves.

uniform float flash : hint_range(0.0, 1.0) = 0.0;
uniform vec4 flash_color : source_color = vec4(1.0);

void fragment() {
	COLOR.rgb = mix(COLOR.rgb, flash_color.rgb, flash);
}
