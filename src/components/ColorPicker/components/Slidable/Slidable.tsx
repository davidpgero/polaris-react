import React from 'react';

import {isServer} from '../../../../utilities/target';
import {EventListener} from '../../../EventListener';
import styles from '../../ColorPicker.scss';

export interface Position {
  x: number;
  y: number;
}

interface State {
  dragging: boolean;
}

export interface SlidableProps {
  draggerX?: number;
  draggerY?: number;
  onChange(position: Position): void;
  onDraggerHeight?(height: number): void;
}

let isDragging = false;

// Required to solve a bug causing the underlying page/container to scroll
// while trying to drag the ColorPicker controls.
// This must be called as soon as possible to properly prevent the event.
// `passive: false` must also be set, as it seems webkit has changed the "default" behaviour
// https://bugs.webkit.org/show_bug.cgi?id=182521
if (!isServer) {
  window.addEventListener(
    'touchmove',
    (event) => {
      if (!isDragging) {
        return;
      }

      event.preventDefault();
    },
    {passive: false},
  );
}

export class Slidable extends React.PureComponent<SlidableProps, State> {
  state: State = {
    dragging: false,
  };

  private node: HTMLElement | null = null;
  private draggerNode: HTMLElement | null = null;

  componentDidMount() {
    const {onDraggerHeight} = this.props;
    if (onDraggerHeight == null) {
      return;
    }

    const {draggerNode} = this;
    if (draggerNode == null) {
      return;
    }

    onDraggerHeight(draggerNode.clientWidth);

    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        onDraggerHeight(draggerNode.clientWidth);
      }, 0);
    }
  }

  render() {
    const {dragging} = this.state;
    const {draggerX = 0, draggerY = 0} = this.props;

    const draggerPositioning = {
      transform: `translate3d(${draggerX}px, ${draggerY}px, 0)`,
    };

    const moveListener = dragging ? (
      <EventListener
        event="mousemove"
        handler={this.handleMove}
        passive={false}
      />
    ) : null;

    const touchMoveListener = dragging ? (
      <EventListener
        event="touchmove"
        handler={this.handleMove}
        passive={false}
      />
    ) : null;

    const endDragListener = dragging ? (
      <EventListener event="mouseup" handler={this.handleDragEnd} />
    ) : null;

    const touchEndListener = dragging ? (
      <EventListener event="touchend" handler={this.handleDragEnd} />
    ) : null;

    const touchCancelListener = dragging ? (
      <EventListener event="touchcancel" handler={this.handleDragEnd} />
    ) : null;

    return (
      <div
        ref={this.setNode}
        className={styles.Slidable}
        onMouseDown={this.startDrag}
        onTouchStart={this.startDrag}
      >
        {endDragListener}
        {moveListener}
        {touchMoveListener}
        {touchEndListener}
        {touchCancelListener}
        <div
          role="application"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          onKeyUp={this.handleKeyUp}
          style={draggerPositioning}
          className={styles.Dragger}
          ref={this.setDraggerNode}
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
        />
      </div>
    );
  }

  private setDraggerNode = (node: HTMLElement | null) => {
    this.draggerNode = node;
  };

  private setNode = (node: HTMLElement | null) => {
    this.node = node;
  };

  private startDrag = (
    event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
  ) => {
    if (event.type === 'mousedown') {
      const mouseEvent = event as React.MouseEvent<HTMLDivElement>;
      this.handleDraggerMove(mouseEvent.clientX, mouseEvent.clientY);
    }

    isDragging = true;
    this.setState({dragging: true});
  };

  private handleDragEnd = () => {
    isDragging = false;
    this.setState({dragging: false});
  };

  private handleMove = (event: MouseEvent | TouchEvent) => {
    event.stopImmediatePropagation();
    event.stopPropagation();

    if (event.cancelable) {
      event.preventDefault();
    }

    if (event.type === 'mousemove') {
      const mouseEvent = event as MouseEvent;
      this.handleDraggerMove(mouseEvent.clientX, mouseEvent.clientY);
      return;
    }

    const touchEvent = event as TouchEvent;
    this.handleDraggerMove(
      touchEvent.touches[0].clientX,
      touchEvent.touches[0].clientY,
    );
  };

  private handleDraggerMove = (x: number, y: number) => {
    if (this.node == null) {
      return;
    }

    const {onChange} = this.props;

    const rect = this.node.getBoundingClientRect();
    const offsetX = x - rect.left;
    const offsetY = y - rect.top;
    onChange({x: offsetX, y: offsetY});
  };

  private handleKeyUp = (event: React.KeyboardEvent<HTMLElement>) => {
    if (this.node == null) {
      return;
    }
    const {key, shiftKey} = event;
    const twoDimensional = this.props.draggerX !== undefined;
    const {draggerX = 0, draggerY = 0, onChange} = this.props;
    const rect = this.node.getBoundingClientRect();
    const stepX = shiftKey ? rect.width / 20 : rect.width / 100;
    const stepY = shiftKey ? rect.height / 20 : rect.height / 100;

    switch (key) {
      case 'ArrowUp':
        onChange({x: draggerX, y: draggerY - stepY});
        break;
      case 'ArrowDown':
        onChange({x: draggerX, y: draggerY + stepY});
        break;
      case 'ArrowRight':
        if (twoDimensional) {
          onChange({x: draggerX + stepX, y: draggerY});
        }
        break;
      case 'ArrowLeft':
        if (twoDimensional) {
          onChange({x: draggerX - stepX, y: draggerY});
        }
        break;
    }
  };
}
