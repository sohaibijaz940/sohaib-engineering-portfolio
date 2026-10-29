import type { Metadata } from "next";
import AVLVisualizer from "@/components/AVLVisualizer";

export const metadata: Metadata = {
 title: "AVL Tree Lab — Interactive Visualizer",
 description: "Try real AVL tree insert, delete, search and LL/RR/LR/RL rotations in a free browser-based algorithm demo. Based on Sohaib Ijaz's C++ coursework."
};
export default function AVLTreeDemoPage(){return <AVLVisualizer/>;}
