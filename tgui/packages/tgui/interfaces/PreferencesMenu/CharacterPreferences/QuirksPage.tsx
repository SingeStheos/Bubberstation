import { filter } from 'es-toolkit/compat';
import { useState } from 'react';
import { useBackend } from 'tgui/backend';
import {
  Box,
  Button,
  Floating,
  Icon,
  Input,
  Stack,
  Tooltip,
} from 'tgui-core/components';
import { createSearch } from 'tgui-core/string';

import {
  type PreferencesMenuData,
  type Quirk,
  RandomSetting,
  type ServerData,
} from '../types';
import { useRandomToggleState } from '../useRandomToggleState';
import { useServerPrefs } from '../useServerPrefs';
import { getRandomization, PreferenceList } from './MainPage';
import { PersonalityPage } from './PersonalityPage';

function getColorValueClass(quirk: Quirk) {
  if (quirk.value > 0) return 'positive';
  if (quirk.value < 0) return 'negative';
  return 'neutral';
}

function getCorrespondingPreferences(
  customization_options: string[],
  relevant_preferences: Record<string, string> = {},
) {
  return Object.fromEntries(
    filter(Object.entries(relevant_preferences), ([key]) =>
      customization_options.includes(key),
    ),
  );
}

type QuirkEntry = [string, Quirk & { failTooltip?: string }];

type QuirkListProps = {
  quirks: QuirkEntry[];
};

type QuirkProps = {
  handleClick: (quirkName: string, quirk: Quirk) => void;
  randomBodyEnabled: boolean;
  selected: boolean;
  serverData: ServerData;
  quirkActionLocked: boolean;
};

function QuirkGrid(props: QuirkProps & QuirkListProps) {
  const {
    quirks = [],
    selected,
    handleClick,
    serverData,
    randomBodyEnabled,
    quirkActionLocked,
  } = props;

  return (
    <Box
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
        gap: '12.5%',
        padding: '4px',
      }}
    >
      {quirks.map(([quirkKey, quirk]) => (
        <QuirkTile
          key={quirkKey}
          quirk={quirk}
          quirkKey={quirkKey}
          handleClick={handleClick}
          selected={selected}
          serverData={serverData}
          randomBodyEnabled={randomBodyEnabled}
          quirkActionLocked={quirkActionLocked}
        />
      ))}
    </Box>
  );
}

type QuirkDisplayProps = {
  quirk: Quirk & { failTooltip?: string };
  quirkKey: string;
} & QuirkProps;

function QuirkTile(props: QuirkDisplayProps) {
  const { quirk, quirkKey, handleClick, selected, quirkActionLocked } = props;
  const { icon, name, description, value, failTooltip } = quirk;

  const colorClass = getColorValueClass(quirk);

  const baseColor = {
    positive: '#3aa34a',
    neutral: '#777',
    negative: '#b54545',
  }[colorClass];

  const tooltipContent = (
    <Box>
      <Box bold>{name} ({value})</Box>
      <Box>{description}</Box>
      {failTooltip && (
        <Box color="red" mt={1}>
          {failTooltip}
        </Box>
      )}
    </Box>
  );

  return (
    <Tooltip content={tooltipContent}>
      <Box
        onClick={() => {
          if (quirkActionLocked) return;
          handleClick(quirkKey, quirk);
        }}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1 / 1',
          backgroundColor: baseColor,
          borderRadius: '6px',
          cursor: quirkActionLocked ? 'not-allowed' : 'pointer',
          opacity: quirkActionLocked ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon
          name={icon}
          style={{
            fontSize: '2.5em',
            transform: 'scale(0.75)',
            color: 'white',
          }}
        />

        {selected && (
          <Box
            style={{
              position: 'absolute',
              inset: '12%',
              border: '3px solid rgba(255,255,255,0.5)',
              borderRadius: '4px',
              pointerEvents: 'none',
            }}
          />
        )}
      </Box>
    </Tooltip>
  );
}

function QuirkPopper(props) {
  const { act, data } = useBackend<PreferencesMenuData>();
  const {
    customizationExpanded,
    quirk,
    randomBodyEnabled,
    selected,
    serverData,
    setCustomizationExpanded,
  } = props;

  const { customizable, customization_options } = quirk;
  const { character_preferences } = data;

  const hasExpandableCustomization =
    customizable &&
    selected &&
    customization_options &&
    Object.entries(customization_options).length > 0;

  return (
    <Floating
      stopChildPropagation
      placement="bottom-end"
      onOpenChange={setCustomizationExpanded}
      content={
        hasExpandableCustomization && (
          <Box
            onClick={(e) => e.stopPropagation()}
            style={{
              boxShadow: '0px 4px 8px 3px rgba(0, 0, 0, 0.7)',
            }}
          >
            <Stack maxWidth="400px" backgroundColor="black" px="5px" py="3px">
              <Stack.Item>
                <PreferenceList
                  preferences={getCorrespondingPreferences(
                    customization_options,
                    character_preferences.manually_rendered_features,
                  )}
                  randomizations={getRandomization(
                    getCorrespondingPreferences(
                      customization_options,
                      character_preferences.manually_rendered_features,
                    ),
                    serverData,
                    randomBodyEnabled,
                  )}
                  maxHeight="100px"
                />
              </Stack.Item>
            </Stack>
          </Box>
        )
      }
    >
      <div style={{ display: 'flow-root' }}>
        {selected && (
          <Button
            selected={customizationExpanded}
            icon="cog"
            tooltip="Customize"
            style={{ float: 'right' }}
          />
        )}
      </div>
    </Floating>
  );
}

function StatDisplay(props) {
  return (
    <Box
      backgroundColor="#eee"
      bold
      color="black"
      fontSize="1.2em"
      px={3}
      py={0.5}
    >
      {props.children}
    </Box>
  );
}

function QuirkPage() {
  const { act, data } = useBackend<PreferencesMenuData>();

  const [randomToggleEnabled] = useRandomToggleState();
  const randomBodyEnabled =
    data.character_preferences.non_contextual.random_body !==
      RandomSetting.Disabled || randomToggleEnabled;

  const selectedQuirks = data.selected_quirks;
  function setSelectedQuirks(selected_quirks) {
    data.selected_quirks = selected_quirks;
  }

  const [quirkActionLocked, setQuirkActionLocked] = useState(false);

  function withQuirkDebounce(debounce: () => void, delay = 200) {
    if (quirkActionLocked) return;
    setQuirkActionLocked(true);
    debounce();
    setTimeout(() => setQuirkActionLocked(false), delay);
  }

  const [searchQuery, setSearchQuery] = useState('');
  const server_data = useServerPrefs();
  if (!server_data) return;

  const quirkSearch = createSearch(searchQuery, (q: Quirk) => q.name);

  const {
    max_positive_quirks: maxPositiveQuirks,
    quirk_blacklist: quirkBlacklist,
    quirk_info: quirkInfo,
    points_enabled: pointsEnabled,
  } = server_data.quirks;

  const quirks = Object.entries(quirkInfo);
  quirks.sort(([_, a], [__, b]) =>
    a.value === b.value ? (a.name > b.name ? 1 : -1) : a.value - b.value,
  );

  const balance = -data.quirks_balance;
  const positiveQuirks = data.positive_quirk_count;

  function getReasonToNotAdd(quirkName: string) {
    const quirk = quirkInfo[quirkName];

    if (quirk.value > 0) {
      if (maxPositiveQuirks !== -1 && positiveQuirks >= maxPositiveQuirks) {
        return "You can't have any more positive quirks!";
      } else if (pointsEnabled && balance + quirk.value > 0) {
        return 'You need a negative quirk to balance this out!';
      }
    }

    const selectedNames = selectedQuirks.map(
      (k) => quirkInfo[k].name,
    );

    for (const blacklist of quirkBlacklist) {
      if (!blacklist.includes(quirk.name)) continue;

      for (const incompatible of blacklist) {
        if (
          incompatible !== quirk.name &&
          selectedNames.includes(incompatible)
        ) {
          return `This is incompatible with ${incompatible}!`;
        }
      }
    }

    if (data.species_disallowed_quirks.includes(quirk.name)) {
      return 'This quirk is incompatible with your selected species.';
    }
  }

  function getReasonToNotRemove(quirkName: string) {
    const quirk = quirkInfo[quirkName];
    if (pointsEnabled && balance - quirk.value > 0) {
      return 'You need to remove a positive quirk first!';
    }
  }

  return (
    <Stack fill>
      <Stack.Item basis="50%">
        <Stack vertical fill align="center">
          <Box as="b" fontSize="1.6em">Available Quirks</Box>

          <Input
            placeholder="Search quirks..."
            width="200px"
            value={searchQuery}
            onChange={setSearchQuery}
          />

          <QuirkGrid
            selected={false}
            quirkActionLocked={quirkActionLocked}
            handleClick={(quirkName, quirk) => {
              const isSelected = selectedQuirks.includes(quirkName);

              if (!isSelected) {
                if (getReasonToNotAdd(quirkName)) return;

                withQuirkDebounce(() => {
                  setSelectedQuirks([...selectedQuirks, quirkName]);
                  act('give_quirk', { quirk: quirk.name });
                });
              } else {
                if (getReasonToNotRemove(quirkName)) return;

                withQuirkDebounce(() => {
                  setSelectedQuirks(
                    selectedQuirks.filter((q) => q !== quirkName),
                  );
                  act('remove_quirk', { quirk: quirk.name });
                });
              }
            }}
            quirks={quirks
              .filter(([name]) => quirkSearch(quirkInfo[name]))
              .map(([name, quirk]) => [
                name,
                {
                  ...quirk,
                  failTooltip:
                    selectedQuirks.includes(name)
                      ? getReasonToNotRemove(name)
                      : getReasonToNotAdd(name),
                },
              ])}
            serverData={server_data}
            randomBodyEnabled={randomBodyEnabled}
          />
        </Stack>
      </Stack.Item>
    </Stack>
  );
}

export function QuirkPersonalityPage() {
  const [contentPage, setContentPage] = useState<'quirks' | 'personality'>('quirks');

  return (
    <Stack fill vertical>
      <Stack.Item>
        <Stack>
          <Stack.Item grow>
            <Button
              selected={contentPage === 'quirks'}
              onClick={() => setContentPage('quirks')}
              fluid
            >
              Quirks
            </Button>
          </Stack.Item>
          <Stack.Item grow>
            <Button
              selected={contentPage === 'personality'}
              onClick={() => setContentPage('personality')}
              fluid
            >
              Personality
            </Button>
          </Stack.Item>
        </Stack>
      </Stack.Item>

      <Stack.Item grow>
        {contentPage === 'personality'
          ? <PersonalityPage />
          : <QuirkPage />}
      </Stack.Item>
    </Stack>
  );
}
