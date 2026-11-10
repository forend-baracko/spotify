/* eslint-env jest */
// Native rendering is checked on Android; keep the real icon adapter in component tests.
const React = require('react');

jest.doMock('@expo/ui', () => ({
  Host: ({ children, ...props }) => React.createElement('ExpoUiHost', props, children),
  Icon: (props) => React.createElement('ExpoUiIcon', props),
  Button: (props) => React.createElement('ExpoUiButton', props),
  Text: ({ children, ...props }) => React.createElement('ExpoUiText', props, children),
}));

jest.doMock('@expo/ui/jetpack-compose', () => ({
  Button: ({ children, ...props }) => React.createElement('ExpoComposeButton', props, children),
}));
jest.doMock('@expo/ui/jetpack-compose/modifiers', () => ({
  semantics: (params) => ({ $type: 'semantics', ...params }),
}));

[
  'home', 'search', 'library_music', 'add', 'close', 'play_arrow', 'pause',
  'skip_previous', 'skip_next', 'shuffle', 'repeat', 'repeat_one', 'favorite',
  'keyboard_arrow_down', 'more_horiz', 'queue_music', 'playlist_add', 'share',
  'phone_android', 'check', 'chevron_left', 'chevron_right', 'delete', 'music_note',
  'person', 'settings', 'history', 'bar_chart', 'devices', 'logout', 'visibility', 'visibility_off',
].forEach((asset) => {
  jest.doMock(`@expo/material-symbols/${asset}.xml`, () => `${asset}-symbol`, { virtual: true });
});

jest.doMock('../src/components/icons/AppIcon', () =>
  jest.requireActual('../src/components/icons/AppIcon.android')
);
jest.doMock('../src/components/buttons/SecondaryButton', () =>
  jest.requireActual('../src/components/buttons/SecondaryButton.android')
);
jest.doMock('../src/components/buttons/PrimaryButton', () =>
  jest.requireActual('../src/components/buttons/PrimaryButton.android')
);
jest.doMock('../src/components/buttons/PlaylistButton', () =>
  jest.requireActual('../src/components/buttons/PlaylistButton.android')
);
