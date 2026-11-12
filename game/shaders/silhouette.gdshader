shader_type canvas_item;
render_mode blend_add;
// Solid-colour silhouette of the sprite (afterimages), optionally grown into a soft glow
// by sampling the alpha around each pixel (outline glow).

uniform vec4 tint : source_color = vec4(1.0, 0.7, 0.3, 1.0);
uniform float strength = 1.0;
// Glow radius in texture pixels; 0 = plain silhouette.
uniform float radius = 0.0;

void fragment() {
	float a = texture(TEXTURE, UV).a;
	if (radius > 0.0) {
		float acc = 0.0;
		for (int ring = 1; ring <= 3; ring++) {
			float r = radius * float(ring) / 3.0;
			float w = 0.42 / float(ring);
			for (int i = 0; i < 12; i++) {
				float ang = 6.2831853 * float(i) / 12.0;
				acc += texture(TEXTURE, UV + vec2(cos(ang), sin(ang)) * r * TEXTURE_PIXEL_SIZE).a * w;
			}
		}
		a = clamp(acc / 6.0, 0.0, 1.0);
	}
	COLOR = vec4(tint.rgb, a * tint.a * strength * COLOR.a);
}
