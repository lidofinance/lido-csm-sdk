import { CreateNodeOperatorProps } from './types.js';

export const parseCreateOperatorProps = async (
  props: CreateNodeOperatorProps,
): Promise<CreateNodeOperatorProps> => {
  return {
    ...props,
    name: props.name.trim(),
    description: props.description.trim(),
  };
};
