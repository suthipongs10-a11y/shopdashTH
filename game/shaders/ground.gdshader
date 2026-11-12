shader_type canvas_item;
// Procedural sunlit volcanic ground: cracked rock plates (voronoi) with glowing lava seams
// and pools. Placeholder until a painted map exists at art/maps/volcano/ground.png.

uniform vec2 map_size = vec2(3600.0, 2400.0);
uniform float cell = 110.0;
uniform float squash = 0.62;
uniform vec3 rock_a : source_color = vec3(0.60, 0.36, 0.27);
uniform vec3 rock_b : source_color = vec3(0.80, 0.56, 0.38);
uniform vec3 crack_color : source_color = vec3(0.33, 0.15, 0.12);
uniform vec3 lava_a : source_color = vec3(1.0, 0.45, 0.08);
uniform vec3 lava_b : source_color = vec3(1.0, 0.86, 0.35);
uniform vec3 moss : source_color = vec3(0.42, 0.62, 0.36);

vec2 hash2(vec2 p) {
	p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
	return fract(sin(p) * 43758.5453);
}

float hash1(vec2 p) {
	return fract(sin(dot(p, vec2(41.3, 289.1))) * 17531.73);
}

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	float a = hash1(i);
	float b = hash1(i + vec2(1.0, 0.0));
	float c = hash1(i + vec2(0.0, 1.0));
	float d = hash1(i + vec2(1.0, 1.0));
	return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void fragment() {
	vec2 world = UV * map_size;
	// Work on the un-squashed ground plane so plates look foreshortened on screen.
	vec2 g = vec2(world.x, world.y / squash) / cell;
	vec2 ip = floor(g);
	vec2 fp = fract(g);

	float best = 8.0;
	vec2 near_vec = vec2(0.0);
	vec2 near_cell = vec2(0.0);
	for (int j = -1; j <= 1; j++) {
		for (int i = -1; i <= 1; i++) {
			vec2 o = vec2(float(i), float(j));
			vec2 site = o + 0.1 + 0.8 * hash2(ip + o) - fp;
			float d = dot(site, site);
			if (d < best) {
				best = d;
				near_vec = site;
				near_cell = ip + o;
			}
		}
	}
	float edge = 8.0;
	for (int j = -2; j <= 2; j++) {
		for (int i = -2; i <= 2; i++) {
			vec2 o = vec2(float(i), float(j));
			vec2 site = o + 0.1 + 0.8 * hash2(ip + o) - fp;
			vec2 diff = site - near_vec;
			if (dot(diff, diff) > 0.0001) {
				edge = min(edge, dot(0.5 * (near_vec + site), normalize(diff)));
			}
		}
	}

	float id = hash1(near_cell);
	float region = vnoise(world / 520.0 + 7.0);
	float heat = smoothstep(0.52, 0.78, vnoise(world / 430.0 + 31.0));
	float grain = vnoise(world / 9.0) * 0.5 + vnoise(world / 34.0) * 0.5;

	// Rock plate: per-plate tint, grain, soft bevel lit from the top-left.
	vec3 col = mix(rock_a, rock_b, id * 0.7 + region * 0.3);
	col = mix(col, moss, smoothstep(0.7, 0.95, region) * (1.0 - heat) * 0.55 * step(0.35, id));
	col *= 0.9 + 0.2 * grain;
	float bevel = 1.0 - smoothstep(0.0, 0.22, edge);
	float light = dot(normalize(near_vec + vec2(0.0001)), vec2(0.7, 0.7));
	col *= 1.0 + bevel * light * 0.22;

	// Lava pools: a few whole plates, more of them in hot regions.
	float is_lava = step(1.0 - (0.03 + 0.2 * heat), hash1(near_cell + 17.0));
	float pulse = 0.5 + 0.5 * sin(TIME * 1.6 + id * 30.0);
	float flow = vnoise(world / 26.0 + vec2(TIME * 0.25, 0.0));
	vec3 lava = mix(lava_a, lava_b, flow * 0.7 + pulse * 0.3);
	col = mix(col, lava, is_lava * smoothstep(0.02, 0.1, edge));

	// Cracks between plates; they glow where the ground is hot.
	float crack = 1.0 - smoothstep(0.012, 0.04, edge);
	vec3 seam = mix(crack_color, mix(lava_a, lava_b, pulse), heat);
	col = mix(col, seam, crack);
	float halo = (1.0 - smoothstep(0.03, 0.2, edge)) * heat * 0.35;
	col += lava_a * halo;

	COLOR = vec4(col, 1.0);
}
