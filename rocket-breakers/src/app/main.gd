## App root: boots services (catalog, localisation, assets, save) and switches screens.
extends Node

const TitleScreenScript := preload("res://src/ui/title_screen.gd")
const CombatScreenScript := preload("res://src/ui/combat_screen.gd")

var catalog: Catalog
var localization := LocalizationService.new()
var assets: AssetResolver
var saves := SaveRepository.new()
var profile: Dictionary = {}
var load_status: int = SaveRepository.Status.NEW
var _screen: Node


func _ready() -> void:
	InputBindings.ensure_defaults()
	get_tree().root.theme = ThemeFactory.build()
	catalog = Catalog.load_from()
	if not catalog.is_valid():
		_show_fatal("Catalog validation failed:\n" + "\n".join(catalog.errors))
		return
	assets = AssetResolver.load_from()
	localization.build(catalog)
	var loaded := saves.load_profile()
	profile = loaded["profile"]
	load_status = loaded["status"]
	if load_status == SaveRepository.Status.NEW or load_status == SaveRepository.Status.CORRUPT \
			or load_status == SaveRepository.Status.RECOVERED:
		saves.save_profile(profile)
	if not saves.last_error.is_empty():
		push_warning("save: " + saves.last_error)
	localization.install(str(profile["settings"].get("language", "th")))
	show_title()


func show_title() -> void:
	_swap(TitleScreenScript.new(self))


func show_sandbox() -> void:
	_swap(CombatScreenScript.new(self))


func set_language(locale: String) -> void:
	profile["settings"]["language"] = locale
	saves.save_profile(profile)
	localization.install(locale)


func _swap(next: Node) -> void:
	if _screen != null:
		_screen.queue_free()
	_screen = next
	add_child(next)


func _show_fatal(msg: String) -> void:
	push_error(msg)
	var l := Label.new()
	l.text = msg
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(l)


func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT or what == NOTIFICATION_APPLICATION_PAUSED:
		if _screen != null and _screen.has_method("pause_for_background"):
			_screen.pause_for_background()
