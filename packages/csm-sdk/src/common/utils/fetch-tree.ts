import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { StandardMerkleTreeData } from '../types.js';
import { compareLowercase } from './compare-lowercase.js';
import { fetchOneOf, ParseFn } from './fetch-json.js';

export const parseTree = <T extends any[]>(text: string) => {
  const data: StandardMerkleTreeData<T> = JSON.parse(text);
  return StandardMerkleTree.load(data);
};

export const customParseTree =
  <T extends any[]>(parse: ParseFn<StandardMerkleTreeData<T>>) =>
  (text: string) => {
    const data: StandardMerkleTreeData<T> = parse(text);
    return StandardMerkleTree.load(data);
  };

export const verifyRoot =
  <T extends any[]>(treeRoot: string) =>
  (tree: StandardMerkleTree<T>) =>
    compareLowercase(tree.root, treeRoot);

export const fetchTree = async <T extends any[]>({
  urls,
  root,
  parse,
}: {
  urls: Array<string | null>;
  root: string;
  parse?: ParseFn<StandardMerkleTreeData<T>>;
}): Promise<StandardMerkleTree<T> | null> => {
  const tree = await fetchOneOf({
    urls,
    parse: parse ? customParseTree(parse) : parseTree<T>,
    validate: verifyRoot<T>(root),
  });
  return tree ?? null;
};
