import { Parser } from './FormulaParser.js';
import { tokenize } from './FormulaTokenizer.js';
export function flowFormulaReferences(expression) {
    const found = new Set();
    const visit = (node) => {
        if (node.kind === 'reference')
            found.add(node.value);
        else if (node.kind === 'unary')
            visit(node.value);
        else if (node.kind === 'binary') {
            visit(node.left);
            visit(node.right);
        }
        else if (node.kind === 'call')
            node.args.forEach(visit);
    };
    visit(new Parser(tokenize(expression)).parse());
    return [...found];
}
