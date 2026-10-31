## Project-wide UI theme. Noto Sans Thai (OFL-1.1, assets/fonts/OFL.txt) because
## Godot's built-in font has no Thai glyphs; Latin subset is the fallback face.
class_name ThemeFactory
extends RefCounted

const THAI_REGULAR := "res://assets/fonts/noto-sans-thai-thai-400-normal.woff2"
const LATIN_REGULAR := "res://assets/fonts/noto-sans-thai-latin-400-normal.woff2"
const THAI_BOLD := "res://assets/fonts/noto-sans-thai-thai-700-normal.woff2"
const LATIN_BOLD := "res://assets/fonts/noto-sans-thai-latin-700-normal.woff2"


static func font(bold: bool = false) -> Font:
	var latin: FontFile = load(LATIN_BOLD if bold else LATIN_REGULAR)
	var thai: FontFile = load(THAI_BOLD if bold else THAI_REGULAR)
	var f := latin.duplicate() as FontFile
	f.fallbacks = [thai]
	return f


static func build() -> Theme:
	var t := Theme.new()
	t.default_font = font()
	t.default_font_size = 28
	for type in ["Button", "Label"]:
		t.set_font_size("font_size", type, 30)
	var normal := _box(Palette.UI_PANEL, Palette.UI_EDGE)
	var hover := _box(Color(0.07, 0.16, 0.25, 0.9), Palette.PLAYER_CYAN)
	var pressed := _box(Color(0.1, 0.25, 0.35, 0.95), Palette.PLAYER_CYAN)
	for state in ["normal", "focus"]:
		t.set_stylebox(state, "Button", normal)
	t.set_stylebox("hover", "Button", hover)
	t.set_stylebox("pressed", "Button", pressed)
	t.set_color("font_color", "Button", Palette.UI_TEXT)
	t.set_color("font_color", "Label", Palette.UI_TEXT)
	t.set_stylebox("panel", "Panel", _box(Color(0.02, 0.05, 0.1, 0.92), Palette.UI_EDGE))
	return t


static func _box(bg: Color, edge: Color) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = edge
	s.set_border_width_all(2)
	s.set_corner_radius_all(14)
	s.content_margin_left = 24
	s.content_margin_right = 24
	s.content_margin_top = 14
	s.content_margin_bottom = 14
	return s
