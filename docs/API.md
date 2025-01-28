# API Reference

To use Draw

```js
// Create a Mapbox GL JS map
var map = new Map(mapOptions);

// Create a Draw control
var draw = new MapboxDraw(drawOptions);

// Add the Draw control to your map
map.addControl(draw);
```

**Draw only works after the Mapbox GL JS map has loaded**, so you must interact with Draw only *after* your map's `load` event:

```js
map.on('load', function() {
  draw.add({ .. });
});
```

## Options

All of the following options are optional.

- `keybindings`, boolean (default `true`): Whether or not to enable keyboard interactions for drawing.
- `touchEnabled`, boolean (default `true`): Whether or not to enable touch interactions for drawing.
- `boxSelect`, boolean (default `true`): Whether or not to enable box selection of features with `shift`+`click`+drag. If `false`, `shift`+`click`+drag zooms into an area.
- `clickBuffer`, number (default: `2`): Number of pixels around any feature or vertex (in every direction) that will respond to a click.
- `touchBuffer`, number (default: `25`): Number of pixels around any feature of vertex (in every direction) that will respond to a touch.
- `controls`, Object: Hide or show individual controls. Each property's name is a control, and value is a boolean indicating whether the control is on or off. Available control names are `point`, `line_string`, `polygon`, `trash`, `combine_features` and `uncombine_features`. By default, all controls are on. To change that default, use `displayControlsDefault`.
- `displayControlsDefault`, boolean (default: `true`): The default value for `controls`. For example, if you would like all controls to be *off* by default, and specify an allowed list with `controls`, use `displayControlsDefault: false`.
- `styles`, Array\<Object\>: An array of map style objects. By default, Draw provides a map style for you. To learn about overriding styles, see the [Styling Draw](#styling-draw) section below.
- `modes`, Object: over ride the default modes with your own. `MapboxDraw.modes` can be used to see the default values. More information on custom modes [can be found here](https://github.com/mapbox/mapbox-gl-draw/blob/main/docs/MODES.md).
- `defaultMode`, String (default: `'simple_select'`): the mode (from `modes`) that user will first land in.
- `userProperties`, boolean (default: `false`): properties of a feature will also be available for styling and prefixed with `user_`, e.g., `['==', 'user_custom_label', 'Example']`
- `suppressAPIEvents`, boolean (default: `true`): Whether or not to emit events when calling Draw API methods. If `false`, events will be emitted.

## Modes

By default MapboxDraw ships with a few modes. These modes aim to cover the basic needed functionally for MapboxDraw to create the core GeoJSON feature types. Along with these, MapboxDraw also supports [custom modes. Click here for more details](https://github.com/mapbox/mapbox-gl-draw/blob/main/docs/MODES.md).

The mode name strings are available as an enum at `Draw.modes`.

### `simple_select`

`Draw.modes.SIMPLE_SELECT === 'simple_select'`

Lets you select, delete, and drag features.

In this mode, features can have their selected state changed by the user.

Draw is in `simple_select` mode by default, and will automatically transition into `simple_select` mode again every time the user finishes drawing a feature or exits `direct_select` mode.

### `direct_select`

`Draw.modes.DIRECT_SELECT === 'direct_select'`

Lets you select, delete, and drag vertices; and drag features.

`direct_select` mode does not apply to point features, because they have no vertices.

Draw enters `direct_select` mode when the user clicks a vertex of a selected line or polygon. So `direct_select` mode typically follows `simple_select` mode.

### `draw_line_string`

`Draw.modes.DRAW_LINE_STRING === 'draw_line_string'`

Lets you draw a LineString feature.

### `draw_polygon`

`Draw.modes.DRAW_POLYGON === 'draw_polygon'`

Lets you draw a Polygon feature.

### `draw_point`

`Draw.modes.DRAW_POINT === 'draw_point'`

Lets you draw a Point feature.

## API Methods

`new MapboxDraw()` returns an instance of Draw with the following API:

### `add(geojson: Object) => Array<string>`

This method takes either a GeoJSON Feature, FeatureCollection, or Geometry and adds it to Draw. It returns an array of ids for interacting with the added features. If a feature does not have its own id, one is automatically generated.

The supported GeoJSON feature types are supported: `Point`, `LineString`, `Polygon`, `MultiPoint`,  `MultiLineString`, and `MultiPolygon`.

If you `add()` a feature with an id that is already in use, the existing feature will be updated and no new feature will be added.

Example without a specified feature id:

```js
var feature = { type: 'Point', coordinates: [0, 0] };
var featureIds = draw.add(feature);
console.log(featureIds);
//=> ['some-random-string']
```

Example with a specified feature id:

```js
var feature = {
  id: 'unique-id',
  type: 'Feature',
  properties: {},
  geometry: { type: 'Point', coordinates: [0, 0] }
};
var featureIds = draw.add(feature);
console.log(featureIds)
//=> ['unique-id']
```

---
### `get(featureId: string): ?Feature`

Returns the GeoJSON feature in Draw with the specified id, or `undefined` if the id matches no feature.

Example:

```js
var featureIds = draw.add({ type: 'Point', coordinates: [0, 0] });
var pointId = featureIds[0];
console.log(draw.get(pointId));
//=> { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] } }
```

---
### `getFeatureIdsAt(point: { x: number, y: number }): Array<string>`

Returns an array of feature ids for features currently rendered at the specified point.

Notice that the `point` argument requires `x`, `y` coordinates from pixel space, rather than longitude, latitude coordinates.

With this function, you can use the coordinates provided by mouse events to get information out of Draw.

```js
var featureIds = Draw.getFeatureIdsAt({x: 20, y: 20});
console.log(featureIds)
//=> ['top-feature-at-20-20', 'another-feature-at-20-20']
```
---
### `getSelectedIds(): Array<string>`

Returns an array of feature ids for features currently selected.

---
### `getSelected(): FeatureCollection`

Returns a FeatureCollection of all the features currently selected.

---
### `getSelectedPoints(): FeatureCollection`

Returns a FeatureCollection of Points representing all the vertices currently selected.

---
### `getAll(): FeatureCollection`

Returns a FeatureCollection of all features.

Example:

```js
draw.add({ type: 'Point', coordinates: [0, 0] });
draw.add({ type: 'Point', coordinates: [1, 1] });
draw.add({ type: 'Point', coordinates: [2, 2] });
console.log(draw.getAll());
// {
//   type: 'FeatureCollection',
//   features: [
//     {
//       id: 'random-0'
//       type: 'Feature',
//       geometry: {
//         type: 'Point',
//         coordinates: [0, 0]
//       }
//     },
//     {
//       id: 'random-1'
//       type: 'Feature',
//       geometry: {
//         type: 'Point',
//         coordinates: [1, 1]
//       }
//     },
//     {
//       id: 'random-2'
//       type: 'Feature',
//       geometry: {
//         type: 'Point',
//         coordinates: [2, 2]
//       }
//     }
//   ]
// }
```
---

### `delete(ids: string | Array<string>): draw`

Removes features with the specified ids. Returns the draw instance for chaining.

In `direct_select` mode, deleting the active feature will exit that mode and revert to the `simple_select` mode.

Example:

```js
var feature = { type: 'Point', coordinates: [0, 0] };
var ids = draw.add(feature);
draw
  .delete(ids)
  .getAll();
// { type: 'FeatureCollection', features: [] }
```

---

### `deleteAll(): draw`

Removes all features. Returns the draw instance for chaining.

Example:

```js
draw.add({ type: 'Point', coordinates: [0, 0] });
draw
  .deleteAll()
  .getAll();
// { type: 'FeatureCollection', features: [] }
```

---

### `set(featureCollection: FeatureCollection): Array<string>`

Sets Draw's features to those in the specified FeatureCollection.

Performs whatever delete, create, and update actions are necessary to make Draw's features match the specified FeatureCollection. Effectively, this is the same as `Draw.deleteAll()` followed by `Draw.add(featureCollection)` except that it does not affect performance as much.

Example:

```js
var ids = draw.set({
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: {},
    id: 'example-id',
    geometry: { type: 'Point', coordinates: [0, 0] }
  }]
});
// ['example-id']
```

---

### `trash(): draw`

Invokes the current mode's `trash` action. Returns the draw instance for chaining.

In `simple_select` mode, this deletes all selected features.

In `direct_select` mode, this deletes the selected vertices.

In drawing modes, this cancels drawing and reverts Draw to `simple_select` mode.

If you want to delete features regardless of the current mode, use the `delete` or `deleteAll` function.

---

### `combineFeatures(): draw`

Invokes the current mode's `combineFeatures` action. Returns the draw instance for chaining.

In `simple_select` mode, this combines all selected features into a single Multi* feature, *as long as they are all of the same geometry type*. For example:

- Selection is two LineStrings => MultiLineString
- Selection is a MultiLineString and a LineString => MultiLineString
- Selection is two MultiLineStrings => MultiLineString

Calling this function when features of different geometry types are selected will not cause any changes. For example:

- Selection is a Point and a LineString => no action taken
- Selection is a MultiLineString and a MultiPoint => no action taken

In `direct_select` mode and drawing modes, no action is taken.

---

### `uncombineFeatures(): draw`

Invokes the current mode's `uncombineFeatures` action. Returns the draw instance for chaining.

In `simple_select` mode, this splits each selected Multi* feature into its component feature parts, and leaves non-multifeatures untouched. For example:

- Selection is MultiLineString of two parts => LineString, LineString
- Selection is MultiLineString of three parts => LineString, LineString, LineString
- Selection is MultiLineString of two parts and one Point => LineString, LineString, Point
- Selection is LineString => LineString

In the `direct_select` and drawing modes, no action is taken.

---

### `getMode(): string`

Returns Draw's current mode. For more about the modes, see above.

---

### `changeMode(mode: string, options?: Object): draw`

Changes Draw to another mode. Returns the draw instance for chaining.

The `mode` argument must be one of the mode names described above and enumerated in `Draw.modes`.

`simple_select`, `direct_select`, and `draw_line_string` modes accept an `options` object.

```js
// `simple_select` options
{
  // Array of ids of features that will be initially selected
  featureIds: Array<string>
}
```

```js
// `direct_select` options
{
  // The id of the feature that will be directly selected (required)
  featureId: string
}
```

```js
// `draw_line_string` options
{
  // The id of the LineString to continue drawing
  featureId: string,
  // The point to continue drawing from
  from: Feature<Point>|Point|Array<number>
}
```

---

### `setFeatureProperty(featureId: string, property: string, value: any): draw`

Sets the value of a property on the feature with the specified id. Returns the draw instance for chaining.

This is helpful if you are using Draw's features as your primary data store in your application.

## Events

Draw fires a number of events. All of these events are namespaced with `draw.` and are emitted from the Mapbox GL JS map object. All events are all triggered by user interaction.

```js
map.on('draw.create', function (e) {
  console.log(e.features);
});
```

**If you programmatically invoke a function in the Draw API, any event that *directly corresponds with* that function will not be fired.** For example, if you invoke `draw.delete()`, there will be no corresponding `draw.delete` event, since you already know what you've done. Subsequent events may fire, though, that do not directly correspond to the invoked function. For example, if you have a one feature selected and then invoke `draw.changeMode('draw_polygon')`, you will *not* see a `draw.modechange` event (because that directly corresponds with the invoked function) but you *will* see a `draw.selectionchange` event, since by changing the mode you indirectly deselected a feature.

### `draw.create`

Fired when a feature is created. The following interactions will trigger this event:

- Finish drawing a feature. Simply clicking will create a Point. A LineString or Polygon is only created when the user has finished drawing it — i.e. double-clicked the last vertex or hit Enter — and the drawn feature is valid.

The event data is an object with the following shape:

```js
{
  // Array of GeoJSON objects representing the features that were created
  features: Array<Object>
}
```

### `draw.delete`

Fired when one or more features are deleted. The following interactions will trigger this event:

- Click the trash button when one or more features are selected in `simple_select` mode.
- Hit the <kbd>Backspace</kbd> or <kbd>Delete</kbd> keys when one or features are selected in `simple_select` mode.
- Invoke `draw.trash()` when you have a feature selected in `simple_select` mode.

The event data is an object with the following shape:

```js
{
  // Array of GeoJSON objects representing the features that were deleted
  features: Array<Feature>
}
```

### `draw.combine`

Fired when features are combined. The following interactions will trigger this event:

- Click the Combine button when more than one features are selected in `simple_select` mode.
- Invoke `draw.combineFeatures()` when more than one features are selected in `simple_select` mode.

The event data is an object with the following shape:

```js
{
  deletedFeatures: Array<Feature>, // Array of deleted features (those incorporated into new multifeatures)
  createdFeatures: Array<Feature> // Array of created multifeatures
}
```

### `draw.uncombine`

Fired when features are uncombined. The following interactions will trigger this event:

- Click the Uncombine button when one or more multifeatures are selected in `simple_select` mode. Non-multifeatures may also be selected.
- Invoke `draw.uncombineFeatures()` when one or more multifeatures are selected in `simple_select` mode. Non-multifeatures may also be selected.

The event data is an object with the following shape:

```js
{
  deletedFeatures: Array<Object>, // Array of deleted multifeatures (split into features)
  createdFeatures: Array<Object> // Array of created features
}
```

### `draw.update`

Fired when one or more features are updated. The following interactions will trigger this event, which can be subcategorized by `action`:

- `action: 'move'`
  - Finish moving one or more selected features in `simple_select` mode. The event will only fire when the movement is finished (i.e. when the user releases the mouse button or hits <kbd>Enter</kbd>).
- `action: 'change_coordinates'`
  - Finish moving one or more vertices of a selected feature in `direct_select` mode. The event will only fire when the movement is finished (i.e. when the user releases the mouse button or hits <kbd>Enter</kbd>, or her mouse leaves the map container).
  - Delete one or more vertices of a selected feature in `direct_select` mode, which can be done by hitting the <kbd>Backspace</kbd> or <kbd>Delete</kbd> keys, clicking the Trash button, or invoking `draw.trash()`.
  - Add a vertex to the selected feature by clicking a midpoint on that feature in `direct_select` mode.

This event will *not* fire when a feature is created or deleted. To track those interactions, listen for `draw.create` and `draw.delete` events.

The event data is an object with the following shape:

```js
{
  features: Array<Feature>, // Array of features that were updated
  action: string // Name of the action that triggered the update
}
```

### `draw.selectionchange`

Fired when the selection is changed (i.e. one or more features are selected or deselected). The following interactions will trigger this event:

- Click on a feature to select it.
- When a feature is already selected, shift-click on another feature to add it to the selection.
- Click on a vertex to select it.
- When a vertex is already selected, shift-click on another vertex to add it to the selection.
- Create a box-selection that includes at least one feature.
- Click outside the selected feature(s) to deselect.
- Click away from the selected vertex(s) to deselect.
- Finish drawing a feature (features are selected just after they are created).
- When a feature is already selected, invoke `draw.changeMode()` such that the feature becomes deselected.
- Use `draw.changeMode('simple_select', { featureIds: [..] })` to switch to `simple_select` mode and immediately select the specified features.
- Use `draw.delete`, `draw.deleteAll` or `draw.trash` to delete feature(s).

The event data is an object with the following shape:

```js
{
  features: Array<Feature> // Array of features that are selected after the change
}
```

### `draw.modechange`

Fired when the mode is changed. The following interactions will trigger this event:

- Click the point, line, or polygon buttons to begin drawing (enter a `draw_*` mode).
- Finish drawing a feature (enter `simple_select` mode).
- While in `simple_select` mode, click on an already selected feature (enter `direct_select` mode).
- While in `direct_select` mode, click outside all features (enter `simple_select` mode).

This event is fired just after the current mode stops and just before the next mode starts. A render will not happen until after all event handlers have been triggered, so you can force a mode redirect by calling `draw.changeMode()` inside a `draw.modechange` handler.

The event data is an object with the following shape:

```js
{
  mode: string // The next mode, i.e. the mode that Draw is changing to
}
```

`simple_select` and `direct_select` modes can be initiated with options specific to that mode (see above).

### `draw.render`

Fired just after Draw calls `setData()` on the Mapbox GL JS map. This does not imply that the set data call has finished updating the map, just that the map is being updated.


### `draw.actionable`

Fired as the state of Draw changes to enable and disable different actions. Following this event will enable you know if `draw.trash()`, `draw.combineFeatures()` and `draw.uncombineFeatures()` will have an effect.

```js
{
  actions: {
    trash: true
    combineFeatures: false,
    uncombineFeatures: false
  }
}
```

## Styling Draw

Draw uses a map style that adheres to the [Mapbox GL Style Spec](https://www.mapbox.com/mapbox-gl-style-spec/) with a few caveats.

**source**

The GL Style Spec requires each layer to have a source. However, **do not provide a `source`** when styling Draw. **Draw will provide a `source` for you automatically**. 
The `source` that Draw provides is named `mapbox-gl-draw`.

**id**

The GL Style Spec also requires an id. **You must provide an id**.

In your custom style, you will want to use the following feature properties:

property | values | function
--- | --- | ---
meta | feature, midpoint, vertex | `midpoint` and `vertex` are used on points added to the map to communicate polygon and line handles. `feature` is used for all features.
active | true, false | A feature is active when it is 'selected' in the current mode. `true` and `false` are strings.
mode |  simple_select, direct_select, draw_point, draw_line_string, draw_polygon | Indicates which mode Draw is currently in.

Draw also provides a few more properties on features, but they should not be used for styling. For details on them, see "Using Draw with Mapbox GL JS's `queryRenderedFeatures`" below.

If `opts.userProperties` is set to `true` the properties of a feature will also be available for styling. All user properties are prefixed with `user_` to make sure they do not clash with the Draw properties.

### Example Custom Styles

See [EXAMPLES.md](https://github.com/mapbox/mapbox-gl-draw/blob/main/docs/EXAMPLES.md) for examples of custom styles.

## Using Draw with Mapbox GL JS's `queryRenderedFeatures`

property | values | function
--- | --- | ---
id | string | only available when `meta` is `feature`
parent | string | only available when `meta` is not `feature`
coord_path | string | a `.` separated path to one [lon, lat] entity in the parents coordinates
lon | number | the longitude value of a handle. Only available when `meta` is `midpoint`.
lat | number | the latitude value of a handle. Only available when `meta` is `midpoint`.
