import OneComponent from "../OneShoppingCart/OneShoppingCart.jsx";
import {UneFrame,uneProps} from "../une/shared/UneFrame.jsx";
export default function UneCart(props){return <UneFrame p={props}><OneComponent {...uneProps(props,"ShoppingCart")}/></UneFrame>}
