"use client";

import React, { memo } from "react";
import { BaseEdge, EdgeProps, getBezierPath } from "reactflow";

const EdgeComponent = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
}: EdgeProps) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? "#3b82f6" : "rgba(255,255,255,0.15)",
          strokeWidth: selected ? 5 : 3.5,
          transition: "stroke 0.3s, stroke-width 0.3s",
        }}
      />
      {/* Animated glow underlay */}
      <path
        d={edgePath}
        fill="none"
        stroke={selected ? "#3b82f6" : "transparent"}
        strokeWidth={10}
        strokeOpacity={0.1}
        className="pointer-events-none"
      />
    </>
  );
};

export default memo(EdgeComponent);
