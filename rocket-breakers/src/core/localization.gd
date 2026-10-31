## Builds th/en Translation resources from data/i18n/ui.json plus catalog names
## and registers them with TranslationServer, so all UI uses tr(key).
class_name LocalizationService
extends RefCounted

const UI_PATH := "res://data/i18n/ui.json"
const LOCALES: PackedStringArray = ["th", "en"]
const NAMED_GROUPS: PackedStringArray = [
	"sectors", "missions", "hulls", "weapons", "abilities", "utilities", "bosses", "enemies", "hazards", "fusions",
]

var translations: Dictionary = {}  # locale -> Translation
var missing: PackedStringArray = []
## Catalog names given as a single untranslated string (seeded into both locales).
var needs_translation: PackedStringArray = []


func build(catalog: Catalog, ui_path: String = UI_PATH) -> void:
	for loc in LOCALES:
		var t := Translation.new()
		t.locale = loc
		translations[loc] = t
	var ui = JSON.parse_string(FileAccess.get_file_as_string(ui_path))
	if ui is Dictionary:
		for key in ui:
			_add(key, ui[key])
	else:
		missing.append("ui dictionary unreadable: %s" % ui_path)
	if catalog != null and catalog.is_valid():
		for group in NAMED_GROUPS:
			for r in catalog.raw[group]:
				if r.has("name"):
					_add("%s.%s.name" % [group, r["id"]], r["name"])


func _add(key: String, entry) -> void:
	if entry is String and not entry.is_empty():
		needs_translation.append(key)
		entry = {"th": entry, "en": entry}
	for loc in LOCALES:
		var text := ""
		if entry is Dictionary:
			text = str(entry.get(loc, ""))
		if text.is_empty():
			missing.append("%s [%s]" % [key, loc])
			continue
		(translations[loc] as Translation).add_message(key, text)


func install(locale: String) -> void:
	for loc in translations:
		TranslationServer.remove_translation(translations[loc])
		TranslationServer.add_translation(translations[loc])
	TranslationServer.set_locale(locale if LOCALES.has(locale) else "th")


func text(key: String, locale: String) -> String:
	var t: Translation = translations.get(locale)
	if t == null:
		return key
	var s := t.get_message(key)
	return key if s.is_empty() else String(s)
