import { CreateNodeOperatorProps } from './types';

export const parseCreateOperatorProps = async (
  props: CreateNodeOperatorProps,
): Promise<CreateNodeOperatorProps> => {
  return {
    ...props,
    name: props.name.trim(),
    description: props.description.trim(),
  };
};
