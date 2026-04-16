import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { StandardMerkleTreeData } from './create-merkle-tree-schema';
import { compareLowercase } from './compare-lowercase';
import { fetchOneOf, ParseFn } from './fetch-json';

export const parseTree =
  <T extends any[]>(parse: ParseFn<StandardMerkleTreeData<T>> = JSON.parse) =>
  (text: string) => {
    const data: StandardMerkleTreeData<T> = parse(text);
    return StandardMerkleTree.load(data);
  };

export const verifyRoot =
  (treeRoot: string) => (tree: StandardMerkleTree<any>) =>
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
    parse: parseTree(parse),
    validate: verifyRoot(root),
  });
  return tree ?? null;
};
