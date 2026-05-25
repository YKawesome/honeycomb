import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Eye, EyeOff, Trash2, Box, Circle } from 'lucide-react';
import { SceneObject } from '@gov.nasa.jpl.honeycomb/core';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface SceneHierarchyProps {
    scene: SceneObject[];
    selectedIndex: number | null;
    onSelect: (index: number | null) => void;
    onToggleVisibility: (index: number) => void;
    onDelete: (index: number) => void;
}

interface TreeNode {
    object: SceneObject;
    index: number;
    children: TreeNode[];
}

function buildTree(scene: SceneObject[]): TreeNode[] {
    const nodeMap = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    // Create nodes for all objects
    scene.forEach((obj, index) => {
        nodeMap.set(obj.id, {
            object: obj,
            index,
            children: []
        });
    });

    // Build parent-child relationships
    scene.forEach((obj) => {
        const node = nodeMap.get(obj.id);
        if (!node) return;

        if (obj.parent) {
            const parentNode = nodeMap.get(obj.parent);
            if (parentNode) {
                parentNode.children.push(node);
            } else {
                // Parent not found, treat as root
                roots.push(node);
            }
        } else {
            // No parent, it's a root node
            roots.push(node);
        }
    });

    return roots;
}

function getObjectIcon(object: SceneObject) {
    if (object.type === 'model') {
        return <Box className="h-4 w-4" />;
    }
    return <Circle className="h-4 w-4" />;
}

function TreeNodeComponent({
    node,
    depth = 0,
    selectedIndex,
    onSelect,
    onToggleVisibility,
    onDelete,
}: {
    node: TreeNode;
    depth?: number;
    selectedIndex: number | null;
    onSelect: (index: number) => void;
    onToggleVisibility: (index: number) => void;
    onDelete: (index: number) => void;
}) {
    const [expanded, setExpanded] = useState(true);
    const [visible, setVisible] = useState(true);
    const hasChildren = node.children.length > 0;
    const selected = selectedIndex === node.index;

    const handleToggleVisibility = (e: React.MouseEvent) => {
        e.stopPropagation();
        setVisible(!visible);
        onToggleVisibility(node.index);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(node.index);
    };

    const handleToggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded(!expanded);
    };

    return (
        <>
            <div
                className={cn(
                    "flex items-center gap-1 py-1 px-1.5 hover:bg-accent cursor-pointer group relative",
                    selected && "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                style={{ paddingLeft: `${depth * 12 + 6}px` }}
                onClick={() => onSelect(node.index)}
            >
                <div
                    className="flex-shrink-0 w-3 flex items-center justify-center"
                    onClick={hasChildren ? handleToggleExpand : undefined}
                >
                    {hasChildren ? (
                        expanded ? (
                            <ChevronDown className="h-3 w-3" />
                        ) : (
                            <ChevronRight className="h-3 w-3" />
                        )
                    ) : null}
                </div>
                <div className="flex-shrink-0">
                    {getObjectIcon(node.object)}
                </div>
                <span className="flex-1 truncate text-xs">
                    {node.object.name || 'Unnamed'}
                </span>
                <span className="text-[10px] text-muted-foreground">
                    {node.object.type}
                </span>
                <div className="absolute right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={handleToggleVisibility}
                    >
                        {visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-destructive"
                        onClick={handleDelete}
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            </div>
            {expanded && hasChildren && (
                <>
                    {node.children.map((childNode) => (
                        <TreeNodeComponent
                            key={childNode.object.id}
                            node={childNode}
                            depth={depth + 1}
                            selectedIndex={selectedIndex}
                            onSelect={onSelect}
                            onToggleVisibility={onToggleVisibility}
                            onDelete={onDelete}
                        />
                    ))}
                </>
            )}
        </>
    );
}

export function SceneHierarchy({
    scene,
    selectedIndex,
    onSelect,
    onToggleVisibility,
    onDelete,
}: SceneHierarchyProps) {
    const tree = useMemo(() => buildTree(scene), [scene]);

    return (
        <div className="flex flex-col h-full border-r">
            <div className="flex items-center justify-between px-2 py-1.5 border-b bg-muted/50">
                <h3 className="text-xs font-semibold">Scene</h3>
            </div>
            <ScrollArea className="flex-1">
                <div className="py-1">
                    {tree.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-8">
                            No objects in scene
                        </div>
                    ) : (
                        tree.map((node) => (
                            <TreeNodeComponent
                                key={node.object.id}
                                node={node}
                                depth={0}
                                selectedIndex={selectedIndex}
                                onSelect={onSelect}
                                onToggleVisibility={onToggleVisibility}
                                onDelete={onDelete}
                            />
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
