import React, { ReactElement } from 'react';
import useResizeObserver from 'use-resize-observer';
import mergeRefs from './merge-refs';

type Props = {
  children: (dimens: { width: number; height: number }) => ReactElement;
};

const style = {
  flex: 1,
  width: '100%',
  height: '100%',
  minHeight: 0,
  minWidth: 0,
};

export const FillFlexParent = React.forwardRef(function FillFlexParent(props: Props, forwardRef) {
  const { ref, width, height } = useResizeObserver();
  // Retain the last non-zero dimensions. When a parent (e.g. a collapsed
  // Mantine Accordion panel) shrinks the container to height 0, we keep
  // rendering the children at their last good size instead of unmounting
  // them. This keeps the inner tree mounted across collapse/reopen — so its
  // expansion, selection and scroll state survive — and avoids the re-measure
  // delay before the tree reappears when the panel is opened again.
  const lastSize = React.useRef<{ width: number; height: number } | null>(null);
  if (width && height) {
    lastSize.current = { width, height };
  }
  const size = width && height ? { width, height } : lastSize.current;
  return (
    <div style={style} ref={mergeRefs(ref, forwardRef)}>
      {size ? props.children(size) : null}
    </div>
  );
});
