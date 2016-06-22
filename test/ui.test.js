import test from 'tape';
import ui from '../src/ui';
import spy from 'sinon/lib/sinon/spy'; // avoid babel-register-related error by importing only spy
import Constants from '../src/constants';

function createMockContext({ position, controls } = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const controlContainer = document.createElement('div');
  controlContainer.className = `mapboxgl-ctrl-${position || 'top-left'}`;
  container.appendChild(controlContainer);

  return {
    context: {
      container,
      options: {
        controls,
        keybindings: true
      },
      api: {
        changeMode: spy(),
        trash: spy()
      }
    },
    cleanup() {
      document.body.removeChild(container);
    },
    getControlContainer() {
      return controlContainer;
    }
  };
}

function getButtons() {
  return Array.prototype.slice.call(document.getElementsByClassName(Constants.CONTROL_BUTTON_CLASS));
}

test('ui container classes', t => {
  const { context, cleanup } = createMockContext();
  const testUi = ui(context);

  t.equal(context.container.className, '', 'confirm that class starts empty');

  // Each sub-test relies on state from the prior sub-tests

  t.test('update all classes', st => {
    testUi.queueContainerClasses({
      mode: 'direct_select',
      feature: 'vertex',
      mouse: 'move'
    });
    testUi.updateContainerClasses();
    st.ok(context.container.classList.contains('mode-direct_select'), 'mode class set');
    st.ok(context.container.classList.contains('feature-vertex'), 'feature class set');
    st.ok(context.container.classList.contains('mouse-move'), 'mouse class set');
    st.end();
  });

  t.test('update only feature class', st => {
    testUi.queueContainerClasses({
      feature: 'midpoint'
    });
    testUi.updateContainerClasses();
    st.ok(context.container.classList.contains('mode-direct_select'), 'mode class remains');
    st.ok(context.container.classList.contains('feature-midpoint'), 'feature class updated');
    st.ok(context.container.classList.contains('mouse-move'), 'mouse class remains');
    st.end();
  });

  t.test('update mode and mouse classes', st => {
    testUi.queueContainerClasses({
      mode: 'foo',
      mouse: 'bar'
    });
    testUi.updateContainerClasses();
    st.ok(context.container.classList.contains('mode-foo'), 'mode class updated');
    st.ok(context.container.classList.contains('feature-midpoint'), 'feature class remains');
    st.ok(context.container.classList.contains('mouse-bar'), 'mouse class updated');
    st.end();
  });

  t.test('remove only feature class', st => {
    testUi.queueContainerClasses({
      feature: null
    });
    testUi.updateContainerClasses();
    st.ok(context.container.classList.contains('mode-foo'), 'mode class remains');
    st.ok(context.container.className.indexOf('feature-') === -1, 'feature class removed');
    st.ok(context.container.classList.contains('mouse-bar'), 'mouse class remains');
    st.end();
  });

  t.test('remove all classes', st => {
    testUi.queueContainerClasses({
      feature: null,
      mode: null,
      mouse: null
    });
    testUi.updateContainerClasses();
    st.ok(context.container.className.indexOf('mode-') === -1, 'mode class removed');
    st.ok(context.container.className.indexOf('feature-') === -1, 'feature class still gone');
    st.ok(context.container.className.indexOf('mouse-') === -1, 'mouse class removed');
    st.end();
  });

  cleanup();
  t.end();
});

test('ui buttons with no options.controls', t => {
  const { context, cleanup } = createMockContext();
  const testUi = ui(context);

  t.deepEqual(getButtons(), [], 'confirm we start with no buttons');

  testUi.addButtons();
  t.deepEqual(getButtons(), [], 'still no buttons');

  cleanup();
  t.end();
});

test('ui buttons with one options.controls', t => {
  const { context, cleanup } = createMockContext({
    controls: {
      line_string: true
    }
  });
  const testUi = ui(context);

  t.deepEqual(getButtons(), [], 'confirm we start with no buttons');

  testUi.addButtons();
  const buttons = getButtons();
  t.equal(buttons.length, 1, 'one button added');
  t.ok(buttons[0].classList.contains('mapbox-gl-draw_line'), 'has line class');
  t.ok(buttons[0].classList.contains(Constants.CONTROL_BUTTON_CLASS), 'has control class');

  cleanup();
  t.end();
});

test('ui buttons control group container inserted above attribution control, in control container, by addButtons', t => {
  const { context, cleanup, getControlContainer } = createMockContext({
    controls: {
      trash: true
    }
  });

  const controlContainer = getControlContainer();

  const attributionControl = document.createElement('div');
  attributionControl.className = 'mapboxgl-ctrl-attrib';
  controlContainer.appendChild(attributionControl);

  const testUi = ui(context);

  t.equal(controlContainer.getElementsByClassName('mapboxgl-ctrl-group').length, 0,
    'confirm control group does not exist at first');

  testUi.addButtons();
  const controlGroup = controlContainer.getElementsByClassName('mapboxgl-ctrl-group')[0];
  t.ok(controlGroup, 'control group exists');
  t.equal(controlGroup.parentNode, controlContainer, 'is child of container');

  const controlContainerChildren = Array.prototype.slice.call(controlContainer.children);
  t.equal(controlContainerChildren.indexOf(controlGroup),
    controlContainerChildren.indexOf(attributionControl) - 1,
    'is before attributon control');

  cleanup();
  t.end();
});

test('ui buttons with all options.controls, no attribution control', t => {
  const { context, cleanup } = createMockContext({
    controls: {
      line_string: true,
      point: true,
      polygon: true,
      trash: true
    }
  });
  const testUi = ui(context);

  t.deepEqual(getButtons(), [], 'confirm we start with no buttons');

  testUi.addButtons();
  const buttons = getButtons();
  const controlGroup = context.container.getElementsByClassName('mapboxgl-ctrl-group')[0];

  t.equal(buttons.length, 4, 'one button added');

  t.ok(buttons[0].classList.contains('mapbox-gl-draw_line'), 'first button has line class');
  t.ok(buttons[0].classList.contains(Constants.CONTROL_BUTTON_CLASS), 'first button has control class');
  t.equal(buttons[0].parentNode, controlGroup, 'first button is in controlGroup');
  const lineButton = buttons[0];

  t.ok(buttons[1].classList.contains('mapbox-gl-draw_polygon'), 'second button has polygon class');
  t.ok(buttons[1].classList.contains(Constants.CONTROL_BUTTON_CLASS), 'second button has control class');
  t.equal(buttons[1].parentNode, controlGroup, 'second button is in controlGroup');
  const polygonButton = buttons[1];
  t.ok(buttons[2].classList.contains('mapbox-gl-draw_point'), 'third button has point class');
  t.ok(buttons[2].classList.contains(Constants.CONTROL_BUTTON_CLASS), 'third button has control class');
  t.equal(buttons[2].parentNode, controlGroup, 'third button is in controlGroup');
  const pointButton = buttons[2];
  t.ok(buttons[3].classList.contains('mapbox-gl-draw_trash'), 'fourth button has trash class');
  t.ok(buttons[3].classList.contains(Constants.CONTROL_BUTTON_CLASS), 'fourth button has control class');
  t.equal(buttons[3].parentNode, controlGroup, 'fourth button is in controlGroup');
  const trashButton = buttons[3];

  t.test('click line button', st => {
    lineButton.click();

    st.ok(lineButton.classList.contains('active'), 'line button is active');
    st.notOk(polygonButton.classList.contains('active'), 'polygon button is inactive');
    st.notOk(pointButton.classList.contains('active'), 'point button is inactive');
    st.notOk(trashButton.classList.contains('active'), 'trash button is inactive');

    st.equal(context.api.changeMode.callCount, 1, 'changeMode called');
    st.deepEqual(context.api.changeMode.getCall(0).args, ['draw_line_string'], 'with correct arguments');
    context.api.changeMode.reset();

    st.end();
  });

  t.test('click polygon button', st => {
    polygonButton.click();

    st.notOk(lineButton.classList.contains('active'), 'line button is inactive');
    st.ok(polygonButton.classList.contains('active'), 'polygon button is active');
    st.notOk(pointButton.classList.contains('active'), 'point button is inactive');
    st.notOk(trashButton.classList.contains('active'), 'trash button is inactive');

    st.equal(context.api.changeMode.callCount, 1, 'changeMode called');
    st.deepEqual(context.api.changeMode.getCall(0).args, ['draw_polygon'], 'with correct arguments');
    context.api.changeMode.reset();

    st.end();
  });

  t.test('programmatically activate point button, then programmatically deactivate', st => {
    testUi.setActiveButton('point');

    st.notOk(lineButton.classList.contains('active'), 'line button is inactive');
    st.notOk(polygonButton.classList.contains('active'), 'polygon button is inactive');
    st.ok(pointButton.classList.contains('active'), 'point button is active');
    st.notOk(trashButton.classList.contains('active'), 'trash button is inactive');
    st.equal(context.api.changeMode.callCount, 0, 'changeMode not called');

    testUi.setActiveButton();

    st.notOk(lineButton.classList.contains('active'), 'line button is inactive');
    st.notOk(polygonButton.classList.contains('active'), 'polygon button is inactive');
    st.notOk(pointButton.classList.contains('active'), 'point button is inactive');
    st.notOk(trashButton.classList.contains('active'), 'trash button is inactive');
    st.equal(context.api.changeMode.callCount, 0, 'changeMode not called');

    st.end();
  });

  t.test('click trash button', st => {
    trashButton.click();

    st.notOk(lineButton.classList.contains('active'), 'line button is inactive');
    st.notOk(polygonButton.classList.contains('active'), 'polygon button is inactive');
    st.notOk(pointButton.classList.contains('active'), 'point button is inactive');
    st.notOk(trashButton.classList.contains('active'), 'trash button is inactive');

    st.equal(context.api.changeMode.callCount, 0, 'changeMode not called');
    st.equal(context.api.trash.callCount, 1, 'trash called');

    st.end();
  });

  cleanup();
  t.end();
});
