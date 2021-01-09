import React, { useState } from 'react';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';

type PropType = {
  hasPrompt: boolean;
  activePrompt: any;
  returnPromptResponse: any;
};

const InputForm = (props: any) => {
  const { answer, prompt } = props;
  const [query, setQuery] = useState('');

  return (
    <Box>
      <Box marginRight={1}>
        <Text>{prompt.question}</Text>
      </Box>
      <TextInput value={query} onChange={setQuery} onSubmit={answer} />
    </Box>
  );
};

export default (props: PropType) => {
  if (props.hasPrompt === true) {
    return (
      <InputForm
        key={props.activePrompt.key}
        prompt={props.activePrompt}
        answer={props.returnPromptResponse}
      />
    );
  }

  return (
    <>
      <Box marginLeft={2} marginTop={2}>
        <Text>
          <Spinner />
        </Text>
        <Text color="gray"> Automator running...</Text>
      </Box>
    </>
  );
};
