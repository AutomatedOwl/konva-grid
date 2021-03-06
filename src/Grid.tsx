import React, {
  useRef,
  useCallback,
  useState,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useReducer,
  memo,
  useEffect,
  Key,
} from "react";
import { Stage, Layer, Group, Line } from "react-konva/lib/ReactKonvaCore";
import {
  getRowStartIndexForOffset,
  getRowStopIndexForStartIndex,
  getColumnStartIndexForOffset,
  getColumnStopIndexForStartIndex,
  itemKey,
  getRowOffset,
  getColumnOffset,
  getColumnWidth,
  getRowHeight,
  getEstimatedTotalHeight,
  getEstimatedTotalWidth,
  getBoundedCells,
  cellIndentifier,
  throttle,
  getOffsetForColumnAndAlignment,
  getOffsetForRowAndAlignment,
  requestTimeout,
  cancelTimeout,
  TimeoutID,
  Align,
} from "./helpers";
import { ShapeConfig } from "konva/types/Shape";
import { CellRenderer as defaultItemRenderer } from "./Cell";
import Selection from "./Selection";
import FillHandle from "./FillHandle";
import { createHTMLBox } from "./utils";
import invariant from "tiny-invariant";
import { StageConfig } from "konva/types/Stage";
import { Direction } from "./types";

export interface GridProps {
  /**
   * Width of the grid
   */
  width?: number;
  /**
   * Height of the grid
   */
  height?: number;
  /**
   * No of columns in the grid
   */
  columnCount: number;
  /**
   * No of rows in the grid
   */
  rowCount: number;
  /**
   * Should return height of a row at an index
   */
  rowHeight?: ItemSizer;
  /**
   * Should return width of a column at an index
   */
  columnWidth?: ItemSizer;
  /**
   * Size of the scrollbar. Default is 13
   */
  scrollbarSize?: number;
  /**
   * Helps in lazy grid width calculation
   */
  estimatedColumnWidth?: number;
  /**
   * Helps in lazy grid height calculation
   */
  estimatedRowHeight?: number;
  /**
   * Called when user scrolls the grid
   */
  onScroll?: ({ scrollLeft, scrollTop }: ScrollCoords) => void;
  /**
   * Show scrollbars on the left and right of the grid
   */
  showScrollbar?: boolean;
  /**
   * Currently active cell
   */
  activeCell?: CellInterface;
  /**
   * Background of selection
   */
  selectionBackgroundColor?: string;
  /**
   * Border color of selected area
   */
  selectionBorderColor?: string;
  /**
   * Stroke width of the selection
   */
  selectionStrokeWidth?: number;
  /**
   * Active Cell Stroke width
   */
  activeCellStrokeWidth?: number;
  /**
   * Array of selected cell areas
   */
  selections?: SelectionArea[];
  /**
   * Fill selection
   */
  fillSelection?: SelectionArea | null;
  /**
   * Array of merged cells
   */
  mergedCells?: AreaProps[];
  /**
   * Number of frozen rows
   */
  frozenRows?: number;
  /**
   * Number of frozen columns
   */
  frozenColumns?: number;
  /**
   * Snap to row and column when scrolling
   */
  snap?: boolean;
  /**
   * Show shadow as you scroll for frozen rows and columns
   */
  showFrozenShadow?: boolean;
  /**
   * Shadow settings
   */
  shadowSettings?: ShapeConfig;
  /**
   * Scroll throttle wait timeout
   */
  scrollThrottleTimeout?: number;
  /**
   * Cell styles for border
   */
  borderStyles?: StylingProps;
  /**
   * Extend certains to coords
   */
  cellAreas?: CellRangeArea[];
  /**
   * Cell renderer. Must be a Konva Component eg: Group, Rect etc
   */
  itemRenderer?: (props: RendererProps) => React.ReactNode;
  /**
   * Allow users to customize selected cells design
   */
  selectionRenderer?: (props: SelectionProps) => React.ReactNode;
  /**
   * Bind to fill handle
   */
  fillHandleProps?: Record<string, (e: any) => void>;
  /**
   * Fired when scroll viewport changes
   */
  onViewChange?: (view: ViewPortProps) => void;
  /**
   * Called right before a row is being rendered.
   * Will be called for frozen cells and merged cells
   */
  onBeforeRenderRow?: (rowIndex: number) => void;
  /**
   * Custom grid overlays
   */
  children?: (props: ScrollCoords) => React.ReactNode;
  /**
   * Allows users to Wrap stage children in Top level Context
   */
  wrapper?: (children: React.ReactNode) => React.ReactNode;
  /**
   * Props that can be injected to Konva stage
   */
  stageProps?: Omit<StageConfig, "container">;
  /**
   * Show fillhandle
   */
  showFillHandle?: boolean;
  /**
   * Overscan row and columns
   */
  overscanCount?: number;
}

export interface CellRangeArea extends CellInterface {
  toColumnIndex: number;
}

export type RefAttribute = {
  ref?: React.MutableRefObject<GridRef>;
};

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
export interface SelectionProps extends ShapeConfig {
  fillHandleProps?: Record<string, (e: any) => void>;
}

export type ScrollCoords = {
  scrollTop: number;
  scrollLeft: number;
};

export type OptionalScrollCoords = {
  scrollTop?: number;
  scrollLeft?: number;
};

export interface ScrollState extends ScrollCoords {
  isScrolling: boolean;
  verticalScrollDirection: Direction;
  horizontalScrollDirection: Direction;
}

export type RenderComponent = React.FC<RendererProps>;
export interface CellPosition
  extends Pick<ShapeConfig, "x" | "y" | "width" | "height"> {}
export interface RendererProps
  extends CellInterface,
    CellPosition,
    ShapeConfig {
  key: Key;
}

export type ItemSizer = (index: number) => number;

export interface SelectionArea extends AreaStyle {
  bounds: AreaProps;
  inProgress?: boolean;
  /**
   * When user drags the fill handle
   */
  isFilling?: boolean;
}
export interface AreaProps {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface CellInterface {
  rowIndex: number;
  columnIndex: number;
}

export interface OptionalCellInterface {
  rowIndex?: number;
  columnIndex?: number;
}

export interface ViewPortProps {
  rowStartIndex: number;
  rowStopIndex: number;
  columnStartIndex: number;
  columnStopIndex: number;
}

export interface InstanceInterface {
  columnMetadataMap: CellMetaDataMap;
  rowMetadataMap: CellMetaDataMap;
  lastMeasuredColumnIndex: number;
  lastMeasuredRowIndex: number;
  estimatedRowHeight: number;
  estimatedColumnWidth: number;
  recalcColumnIndices: number[];
  recalcRowIndices: number[];
}

export type CellMetaDataMap = Record<number, CellMetaData>;
export type CellMetaData = {
  offset: number;
  size: number;
};

export interface SnapRowProps {
  rowStartIndex: number;
  rowCount: number;
  deltaY: number;
}

export interface SnapColumnProps {
  columnStartIndex: number;
  columnCount: number;
  deltaX: number;
  frozenColumns: number;
}

export interface PosXY {
  x?: number;
  y?: number;
}

export type GridRef = {
  scrollTo: (scrollPosition: ScrollCoords) => void;
  scrollBy: (pos: PosXY) => void;
  stage: Stage | null;
  container: HTMLDivElement | null;
  resetAfterIndices: (
    coords: CellInterface,
    shouldForceUpdate?: boolean
  ) => void;
  getScrollPosition: () => ScrollCoords;
  isMergedCell: (coords: CellInterface) => boolean;
  getCellBounds: (coords: CellInterface) => AreaProps;
  getCellCoordsFromOffset: (x: number, y: number) => CellInterface | null;
  getCellOffsetFromCoords: (coords: CellInterface) => CellPosition;
  scrollToItem: (coords: OptionalCellInterface, align?: Align) => void;
  focus: () => void;
  resizeColumns: (indices: number[]) => void;
  resizeRows: (indices: number[]) => void;
  getViewPort: () => ViewPortProps;
};

export type MergedCellMap = Map<string, AreaProps>;

export type StylingProps = AreaStyle[];
export interface AreaStyle {
  bounds: AreaProps;
  style?: ShapeConfig;
}

const DEFAULT_ESTIMATED_ITEM_SIZE = 50;
const defaultShadowSettings: ShapeConfig = {
  stroke: "#000",
  shadowColor: "black",
  shadowBlur: 5,
  shadowOpacity: 0.4,
  shadowOffsetX: 2,
};
const defaultRowHeight = () => 20;
const defaultColumnWidth = () => 60;
const defaultSelectionRenderer = (props: SelectionProps) => {
  return <Selection {...props} />;
};
const RESET_SCROLL_EVENTS_DEBOUNCE_INTERVAL = 150;

/**
 * Grid component using React Konva
 * @param props
 */
const Grid: React.FC<GridProps & RefAttribute> = memo(
  forwardRef<GridRef, GridProps>((props, forwardedRef) => {
    const {
      width: containerWidth = 800,
      height: containerHeight = 600,
      estimatedColumnWidth,
      estimatedRowHeight,
      rowHeight = defaultRowHeight,
      columnWidth = defaultColumnWidth,
      rowCount = 0,
      columnCount = 0,
      scrollbarSize = 13,
      onScroll,
      showScrollbar = true,
      selectionBackgroundColor = "rgb(14, 101, 235, 0.1)",
      selectionBorderColor = "#1a73e8",
      selectionStrokeWidth = 1,
      activeCellStrokeWidth = 2,
      activeCell,
      selections = [],
      frozenRows = 0,
      frozenColumns = 0,
      itemRenderer = defaultItemRenderer,
      mergedCells = [],
      snap = false,
      scrollThrottleTimeout = 100,
      onViewChange,
      selectionRenderer = defaultSelectionRenderer,
      onBeforeRenderRow,
      showFrozenShadow = false,
      shadowSettings = defaultShadowSettings,
      borderStyles = [],
      children,
      stageProps,
      wrapper = (children: React.ReactNode): React.ReactNode => children,
      cellAreas = [],
      showFillHandle = true,
      fillSelection,
      overscanCount = 1,
      fillHandleProps,
      ...rest
    } = props;

    invariant(
      !(children && typeof children !== "function"),
      "Children should be a function"
    );

    /* Expose some methods in ref */
    useImperativeHandle(forwardedRef, () => {
      return {
        scrollTo,
        scrollBy,
        scrollToItem,
        stage: stageRef.current,
        container: containerRef.current,
        resetAfterIndices,
        getScrollPosition,
        isMergedCell,
        getCellBounds,
        getCellCoordsFromOffset,
        getCellOffsetFromCoords,
        focus: focusContainer,
        resizeColumns,
        resizeRows,
        getViewPort,
      };
    });

    const instanceProps = useRef<InstanceInterface>({
      columnMetadataMap: {},
      rowMetadataMap: {},
      lastMeasuredColumnIndex: -1,
      lastMeasuredRowIndex: -1,
      estimatedColumnWidth: estimatedColumnWidth || DEFAULT_ESTIMATED_ITEM_SIZE,
      estimatedRowHeight: estimatedRowHeight || DEFAULT_ESTIMATED_ITEM_SIZE,
      recalcColumnIndices: [],
      recalcRowIndices: [],
    });
    const stageRef = useRef<Stage | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const verticalScrollRef = useRef<HTMLDivElement>(null);
    const wheelingRef = useRef<number | null>(null);
    const horizontalScrollRef = useRef<HTMLDivElement>(null);
    const [_, forceRender] = useReducer((s) => s + 1, 0);
    const [scrollState, setScrollState] = useState<ScrollState>({
      scrollTop: 0,
      scrollLeft: 0,
      isScrolling: false,
      verticalScrollDirection: Direction.Down,
      horizontalScrollDirection: Direction.Right,
    });
    const {
      scrollTop,
      scrollLeft,
      isScrolling,
      verticalScrollDirection,
      horizontalScrollDirection,
    } = scrollState;

    /* Focus container */
    const focusContainer = useCallback(() => {
      return containerRef.current?.focus();
    }, []);

    /**
     * Handle mouse wheeel
     */
    useEffect(() => {
      containerRef.current?.addEventListener("wheel", handleWheel, {
        passive: true,
      });
    }, []);
    /**
     * Snaps vertical scrollbar to the next/prev visible row
     */
    const snapToRowFn = useCallback(
      ({ rowStartIndex, rowCount, deltaY }: SnapRowProps) => {
        if (!verticalScrollRef.current) return;
        if (deltaY !== 0) {
          const nextRowIndex =
            deltaY < 0
              ? // User is scrolling up
                Math.max(0, rowStartIndex)
              : Math.min(rowStartIndex + frozenRows, rowCount - 1);
          /* TODO: Fix bug when frozenRowHeight > minRow height, which causes rowStartIndex to be 1 even after a scroll */
          const rowHeight = getRowHeight(nextRowIndex, instanceProps.current);
          verticalScrollRef.current.scrollTop +=
            (deltaY < 0 ? -1 : 1) * rowHeight;
        }
      },
      []
    );

    /**
     * Snaps horizontal scrollbar to the next/prev visible column
     */
    const snapToColumnFn = useCallback(
      ({
        columnStartIndex,
        columnCount,
        deltaX,
        frozenColumns,
      }: SnapColumnProps) => {
        if (!horizontalScrollRef.current) return;
        if (deltaX !== 0) {
          const nextColumnIndex =
            deltaX < 0
              ? Math.max(0, columnStartIndex)
              : Math.min(columnStartIndex + frozenColumns, columnCount - 1);
          const columnWidth = getColumnWidth(
            nextColumnIndex,
            instanceProps.current
          );
          horizontalScrollRef.current.scrollLeft +=
            (deltaX < 0 ? -1 : 1) * columnWidth;
        }
      },
      []
    );
    const snapToRowThrottler = useRef(
      throttle(snapToRowFn, scrollThrottleTimeout)
    );
    const snapToColumnThrottler = useRef(
      throttle(snapToColumnFn, scrollThrottleTimeout)
    );

    /**
     * Imperatively get the current scroll position
     */
    const getScrollPosition = useCallback(() => {
      return {
        scrollTop,
        scrollLeft,
      };
    }, [scrollTop, scrollLeft]);

    /* Redraw grid imperatively */
    const resetAfterIndices = useCallback(
      (
        { columnIndex, rowIndex }: OptionalCellInterface,
        shouldForceUpdate: boolean = true
      ) => {
        if (typeof columnIndex === "number") {
          instanceProps.current.lastMeasuredColumnIndex = Math.min(
            instanceProps.current.lastMeasuredColumnIndex,
            columnIndex - 1
          );
        }
        if (typeof rowIndex === "number") {
          instanceProps.current.lastMeasuredRowIndex = Math.min(
            instanceProps.current.lastMeasuredRowIndex,
            rowIndex - 1
          );
        }
        if (shouldForceUpdate) forceRender();
      },
      []
    );

    /**
     * Create a map of merged cells
     * [rowIndex, columnindex] => [parentRowIndex, parentColumnIndex]
     */
    const mergedCellMap = useMemo((): MergedCellMap => {
      const mergedCellMap = new Map();
      for (let i = 0; i < mergedCells.length; i++) {
        const bounds = mergedCells[i];
        const { top, left } = bounds;
        for (const cell of getBoundedCells(bounds)) {
          mergedCellMap.set(cell, bounds);
        }
      }
      return mergedCellMap;
    }, [mergedCells]);

    /* Check if a cell is part of a merged cell */
    const isMergedCell = useCallback(
      ({ rowIndex, columnIndex }: CellInterface) => {
        return mergedCellMap.has(cellIndentifier(rowIndex, columnIndex));
      },
      [mergedCellMap]
    );

    /* Get top, left bounds of a cell */
    const getCellBounds = useCallback(
      ({ rowIndex, columnIndex }: CellInterface): AreaProps => {
        const isMerged = isMergedCell({ rowIndex, columnIndex });
        if (isMerged)
          return mergedCellMap.get(
            cellIndentifier(rowIndex, columnIndex)
          ) as AreaProps;
        return {
          top: rowIndex,
          left: columnIndex,
          right: columnIndex,
          bottom: rowIndex,
        } as AreaProps;
      },
      [mergedCellMap]
    );

    const getVerticalRangeToRender = () => {
      const startIndex = getRowStartIndexForOffset({
        rowHeight,
        columnWidth,
        rowCount,
        columnCount,
        instanceProps: instanceProps.current,
        offset: scrollTop,
      });
      const stopIndex = getRowStopIndexForStartIndex({
        startIndex,
        rowCount,
        rowHeight,
        columnWidth,
        scrollTop,
        containerHeight,
        instanceProps: instanceProps.current,
      });

      // Overscan by one item in each direction so that tab/focus works.
      // If there isn't at least one extra item, tab loops back around.
      const overscanBackward =
        !isScrolling || verticalScrollDirection === Direction.Up
          ? Math.max(1, overscanCount)
          : 1;
      const overscanForward =
        !isScrolling || verticalScrollDirection === Direction.Down
          ? Math.max(1, overscanCount)
          : 1;

      return [
        Math.max(0, startIndex - overscanBackward),
        Math.max(0, Math.min(rowCount - 1, stopIndex + overscanForward)),
        startIndex,
        stopIndex,
      ];
    };

    const getHorizontalRangeToRender = () => {
      const startIndex = getColumnStartIndexForOffset({
        rowHeight,
        columnWidth,
        rowCount,
        columnCount,
        instanceProps: instanceProps.current,
        offset: scrollLeft,
      });

      const stopIndex = getColumnStopIndexForStartIndex({
        startIndex,
        columnCount,
        rowHeight,
        columnWidth,
        scrollLeft,
        containerWidth,
        instanceProps: instanceProps.current,
      });

      // Overscan by one item in each direction so that tab/focus works.
      // If there isn't at least one extra item, tab loops back around.
      const overscanBackward =
        !isScrolling || horizontalScrollDirection === Direction.Left
          ? Math.max(1, overscanCount)
          : 1;
      const overscanForward =
        !isScrolling || horizontalScrollDirection === Direction.Right
          ? Math.max(1, overscanCount)
          : 1;

      return [
        Math.max(0, startIndex - overscanBackward),
        Math.max(0, Math.min(columnCount - 1, stopIndex + overscanForward)),
        startIndex,
        stopIndex,
      ];
    };

    const [rowStartIndex, rowStopIndex] = getVerticalRangeToRender();
    const [columnStartIndex, columnStopIndex] = getHorizontalRangeToRender();

    const estimatedTotalHeight = getEstimatedTotalHeight(
      rowCount,
      instanceProps.current
    );
    const estimatedTotalWidth = getEstimatedTotalWidth(
      columnCount,
      instanceProps.current
    );

    /* Find frozen column boundary */
    const frozenColumnWidth = useMemo(() => {
      return getColumnOffset({
        index: frozenColumns,
        rowHeight,
        columnWidth,
        instanceProps: instanceProps.current,
      });
    }, [frozenColumns]);
    const frozenRowHeight = useMemo(() => {
      return getRowOffset({
        index: frozenRows,
        rowHeight,
        columnWidth,
        instanceProps: instanceProps.current,
      });
    }, [frozenRows]);
    const isWithinFrozenColumnBoundary = useCallback(
      (x: number) => {
        return frozenColumns > 0 && x < frozenColumnWidth;
      },
      [frozenColumns, frozenColumnWidth]
    );

    /* Find frozen row boundary */
    const isWithinFrozenRowBoundary = useCallback(
      (y: number) => {
        return frozenRows > 0 && y < frozenRowHeight;
      },
      [frozenRows, frozenRowHeight]
    );

    /**
     * Get cell cordinates from current mouse x/y positions
     */
    const getCellCoordsFromOffset = useCallback(
      (left: number, top: number): CellInterface | null => {
        invariant(
          typeof left === "number" && typeof top === "number",
          "Top and left should be a number"
        );
        if (!stageRef.current) return null;
        const stage = stageRef.current.getStage();
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          left = left - rect.x;
          top = top - rect.y;
        }
        const { x, y } = stage
          .getAbsoluteTransform()
          .copy()
          .invert()
          .point({ x: left, y: top });
        const rowIndex = getRowStartIndexForOffset({
          rowHeight,
          columnWidth,
          rowCount,
          columnCount,
          instanceProps: instanceProps.current,
          offset: isWithinFrozenRowBoundary(y) ? y : y + scrollTop,
        });
        const columnIndex = getColumnStartIndexForOffset({
          rowHeight,
          columnWidth,
          rowCount,
          columnCount,
          instanceProps: instanceProps.current,
          offset: isWithinFrozenColumnBoundary(x) ? x : x + scrollLeft,
        });
        /* To be compatible with merged cells */
        const bounds = getCellBounds({ rowIndex, columnIndex });

        return { rowIndex: bounds.top, columnIndex: bounds.left };
      },
      [scrollLeft, scrollTop, rowCount, columnCount]
    );

    /**
     * Get cell offset position from rowIndex, columnIndex
     */
    const getCellOffsetFromCoords = useCallback(
      ({ rowIndex, columnIndex }: CellInterface): CellPosition => {
        const x = getColumnOffset({
          index: columnIndex,
          rowHeight,
          columnWidth,
          instanceProps: instanceProps.current,
        });
        const y = getRowOffset({
          index: rowIndex,
          rowHeight,
          columnWidth,
          instanceProps: instanceProps.current,
        });
        const width = getColumnWidth(columnIndex, instanceProps.current);
        const height = getRowHeight(rowIndex, instanceProps.current);

        return {
          x,
          y,
          width,
          height,
        };
      },
      []
    );

    /**
     * Resize one or more columns
     */
    const resizeColumns = useCallback((indices: number[]) => {
      const leftMost = Math.min(...indices);
      resetAfterIndices({ columnIndex: leftMost }, false);
      instanceProps.current.recalcColumnIndices = indices;
      forceRender();
    }, []);

    /**
     * Resize one or more rows
     */
    const resizeRows = useCallback((indices: number[]) => {
      const topMost = Math.min(...indices);
      resetAfterIndices({ rowIndex: topMost }, false);
      instanceProps.current.recalcRowIndices = indices;
      forceRender();
    }, []);

    /* Always if the viewport changes */
    useEffect(() => {
      if (instanceProps.current.recalcColumnIndices.length) {
        instanceProps.current.recalcColumnIndices.length = 0;
      }
      if (instanceProps.current.recalcRowIndices.length) {
        instanceProps.current.recalcRowIndices.length = 0;
      }
    }, [rowStopIndex, columnStopIndex]);

    /* Get current view port of the grid */
    const getViewPort = useCallback((): ViewPortProps => {
      return {
        rowStartIndex,
        rowStopIndex,
        columnStartIndex,
        columnStopIndex,
      };
    }, [rowStartIndex, rowStopIndex, columnStartIndex, columnStopIndex]);

    /**
     * When the grid is scrolling,
     * 1. Stage does not listen to any mouse events
     * 2. Div container does not listen to pointer events
     */
    const resetIsScrollingTimeoutID = useRef<TimeoutID | null>(null);
    const resetIsScrollingDebounced = useCallback(() => {
      if (resetIsScrollingTimeoutID.current !== null) {
        cancelTimeout(resetIsScrollingTimeoutID.current);
      }
      resetIsScrollingTimeoutID.current = requestTimeout(
        resetIsScrolling,
        RESET_SCROLL_EVENTS_DEBOUNCE_INTERVAL
      );
    }, []);
    /* Reset isScrolling */
    const resetIsScrolling = useCallback(() => {
      resetIsScrollingTimeoutID.current = null;

      setScrollState((prev) => {
        return {
          ...prev,
          isScrolling: false,
        };
      });
    }, []);

    /* Handle vertical scroll */
    const handleScroll = useCallback(
      (e) => {
        const { scrollTop } = e.target;

        setScrollState((prev) => ({
          ...prev,
          isScrolling: true,
          verticalScrollDirection:
            prev.scrollTop > scrollTop ? Direction.Up : Direction.Down,
          scrollTop,
        }));

        /* Scroll callbacks */
        onScroll && onScroll({ scrollTop, scrollLeft });

        /* Reset isScrolling if required */
        resetIsScrollingDebounced();
      },
      [scrollLeft]
    );

    /* Handle horizontal scroll */
    const handleScrollLeft = useCallback(
      (e) => {
        const { scrollLeft } = e.target;
        setScrollState((prev) => ({
          ...prev,
          isScrolling: true,
          horizontalScrollDirection:
            prev.scrollLeft > scrollLeft ? Direction.Left : Direction.Right,
          scrollLeft,
        }));
        /* Scroll callbacks */
        onScroll && onScroll({ scrollLeft, scrollTop });

        /* Reset isScrolling if required */
        resetIsScrollingDebounced();
      },
      [scrollTop]
    );

    /* Scroll based on left, top position */
    const scrollTo = useCallback(
      ({ scrollTop, scrollLeft }: OptionalScrollCoords) => {
        /* If scrollbar is visible, lets update it which triggers a state change */
        if (showScrollbar) {
          if (horizontalScrollRef.current && scrollLeft !== void 0)
            horizontalScrollRef.current.scrollLeft = scrollLeft;
          if (verticalScrollRef.current && scrollTop !== void 0)
            verticalScrollRef.current.scrollTop = scrollTop;
        } else {
          setScrollState((prev) => {
            return {
              ...prev,
              scrollLeft: scrollLeft == void 0 ? prev.scrollLeft : scrollLeft,
              scrollTop: scrollTop == void 0 ? prev.scrollTop : scrollTop,
            };
          });
        }
      },
      [showScrollbar]
    );

    /**
     * Scrollby utility
     */
    const scrollBy = useCallback(({ x, y }: PosXY) => {
      if (showScrollbar) {
        if (horizontalScrollRef.current && x !== void 0)
          horizontalScrollRef.current.scrollLeft += x;
        if (verticalScrollRef.current && y !== void 0)
          verticalScrollRef.current.scrollTop += y;
      } else {
        setScrollState((prev) => {
          return {
            ...prev,
            scrollLeft: x == void 0 ? prev.scrollLeft : prev.scrollLeft + x,
            scrollTop: y == void 0 ? prev.scrollTop : prev.scrollTop + y,
          };
        });
      }
    }, []);

    const scrollToItem = useCallback(
      (
        { rowIndex, columnIndex }: OptionalCellInterface,
        align: Align = Align.smart
      ) => {
        /* Do not scroll if the row or column is frozen */
        if (
          (rowIndex && rowIndex < frozenRows) ||
          (columnIndex && columnIndex < frozenColumns)
        )
          return;
        const frozenColumnOffset = getColumnOffset({
          index: frozenColumns,
          rowHeight,
          columnWidth,
          instanceProps: instanceProps.current,
        });
        const newScrollLeft =
          columnIndex !== void 0
            ? getOffsetForColumnAndAlignment({
                index: columnIndex,
                containerHeight,
                containerWidth,
                columnCount,
                columnWidth,
                rowCount,
                rowHeight,
                scrollOffset: scrollLeft,
                instanceProps: instanceProps.current,
                scrollbarSize,
                frozenOffset: frozenColumnOffset,
                align,
              })
            : void 0;

        const frozenRowOffset = getRowOffset({
          index: frozenRows,
          rowHeight,
          columnWidth,
          instanceProps: instanceProps.current,
        });
        const newScrollTop =
          rowIndex !== void 0
            ? getOffsetForRowAndAlignment({
                index: rowIndex,
                containerHeight,
                containerWidth,
                columnCount,
                columnWidth,
                rowCount,
                rowHeight,
                scrollOffset: scrollTop,
                instanceProps: instanceProps.current,
                scrollbarSize,
                frozenOffset: frozenRowOffset,
                align,
              })
            : void 0;

        const coords = {
          scrollLeft: newScrollLeft,
          scrollTop: newScrollTop,
        };
        const isOutsideViewport =
          (rowIndex !== void 0 && rowIndex > rowStopIndex) ||
          (columnIndex !== void 0 && columnIndex > columnStopIndex);

        /* Scroll in the next frame, Useful when user wants to jump from 1st column to last */
        if (isOutsideViewport) {
          window.requestAnimationFrame(() => {
            scrollTo(coords);
          });
        } else scrollTo(coords);
      },
      [
        containerHeight,
        containerWidth,
        rowCount,
        columnCount,
        scrollbarSize,
        scrollLeft,
        scrollTop,
        frozenRows,
        frozenColumns,
      ]
    );

    /**
     * Fired when user tries to scroll the canvas
     */
    const handleWheel = useCallback(
      (event: globalThis.MouseWheelEvent) => {
        const { deltaX, deltaY, deltaMode } = event;
        /* If snaps are active */
        if (snap) {
          snapToRowThrottler.current({
            deltaY,
            rowStartIndex,
            rowCount,
            frozenRows,
          });
          snapToColumnThrottler.current({
            deltaX,
            columnStartIndex,
            columnCount,
            frozenColumns,
          });
          return;
        }
        /* Scroll natively */
        if (wheelingRef.current) return;
        let dx = deltaX;
        let dy = deltaY;

        /* Scroll only in one direction */
        const isHorizontal = Math.abs(dx) > Math.abs(dy);

        if (deltaMode === 1) {
          dy = dy * scrollbarSize;
        }
        if (!horizontalScrollRef.current || !verticalScrollRef.current) return;
        const currentScroll = isHorizontal
          ? horizontalScrollRef.current?.scrollLeft
          : verticalScrollRef.current?.scrollTop;
        wheelingRef.current = window.requestAnimationFrame(() => {
          wheelingRef.current = null;
          if (isHorizontal) {
            if (horizontalScrollRef.current)
              horizontalScrollRef.current.scrollLeft = currentScroll + dx;
          } else {
            if (verticalScrollRef.current)
              verticalScrollRef.current.scrollTop = currentScroll + dy;
          }
        });
      },
      [
        rowStartIndex,
        columnStartIndex,
        rowCount,
        columnCount,
        snap,
        frozenColumns,
        frozenRows,
      ]
    );

    /* Callback when visible rows or columns have changed */
    useEffect(() => {
      onViewChange &&
        onViewChange({
          rowStartIndex,
          rowStopIndex,
          columnStartIndex,
          columnStopIndex,
        });
    }, [rowStartIndex, rowStopIndex, columnStartIndex, columnStopIndex]);

    /* Draw all cells */
    const cells = [];
    if (columnCount > 0 && rowCount) {
      for (let rowIndex = rowStartIndex; rowIndex <= rowStopIndex; rowIndex++) {
        /* Skip frozen rows */
        if (rowIndex < frozenRows) {
          continue;
        }
        /**
         * Do any pre-processing of the row before being renderered.
         * Useful for `react-table` to call `prepareRow(row)`
         */
        onBeforeRenderRow && onBeforeRenderRow(rowIndex);

        for (
          let columnIndex = columnStartIndex;
          columnIndex <= columnStopIndex;
          columnIndex++
        ) {
          /* Skip frozen columns and merged cells */
          if (
            columnIndex < frozenColumns ||
            isMergedCell({ rowIndex, columnIndex })
          ) {
            continue;
          }
          const x = getColumnOffset({
            index: columnIndex,
            rowHeight,
            columnWidth,
            instanceProps: instanceProps.current,
          });
          const y = getRowOffset({
            index: rowIndex,
            rowHeight,
            columnWidth,
            instanceProps: instanceProps.current,
          });
          const width = getColumnWidth(columnIndex, instanceProps.current);
          const height = getRowHeight(rowIndex, instanceProps.current);
          cells.push(
            itemRenderer({
              x,
              y,
              width,
              height,
              rowIndex,
              columnIndex,
              key: itemKey({ rowIndex, columnIndex }),
            })
          );
        }
      }
    }

    /**
     * Extend certain cells.
     * Mimics google sheets functionality where
     * oevrflowed cell content can cover adjacent cells
     */
    const ranges = [];
    for (const { rowIndex, columnIndex, toColumnIndex } of cellAreas) {
      /* Skip merged cells, Merged  cell cannot be extended */
      if (isMergedCell({ rowIndex, columnIndex })) {
        continue;
      }
      const x = getColumnOffset({
        index: columnIndex,
        rowHeight,
        columnWidth,
        instanceProps: instanceProps.current,
      });
      const y = getRowOffset({
        index: rowIndex,
        rowHeight,
        columnWidth,
        instanceProps: instanceProps.current,
      });
      const height = getRowHeight(rowIndex, instanceProps.current);
      const { x: offsetX = 0 } = getCellOffsetFromCoords({
        rowIndex,
        columnIndex: toColumnIndex + 1,
      });
      ranges.push(
        itemRenderer({
          x,
          y,
          width: offsetX - x,
          height,
          rowIndex,
          columnIndex,
          key: `range:${itemKey({ rowIndex, columnIndex })}`,
        })
      );
    }

    /* Draw merged cells */
    const mergedCellAreas = [];
    const frozenColumnMergedCellAreas = [];
    const frozenRowMergedCellAreas = [];
    const frozenIntersectionMergedCells = [];
    for (let i = 0; i < mergedCells.length; i++) {
      const { top: rowIndex, left: columnIndex, right, bottom } = mergedCells[
        i
      ];
      const isLeftBoundFrozen = columnIndex < frozenColumns;
      const isTopBoundFrozen = rowIndex < frozenRows;
      const isIntersectionFrozen =
        rowIndex < frozenRows && columnIndex < frozenColumns;
      const x = getColumnOffset({
        index: columnIndex,
        rowHeight,
        columnWidth,
        instanceProps: instanceProps.current,
      });
      const y = getRowOffset({
        index: rowIndex,
        rowHeight,
        columnWidth,
        instanceProps: instanceProps.current,
      });
      const width =
        getColumnOffset({
          index: right + 1,
          rowHeight,
          columnWidth,
          instanceProps: instanceProps.current,
        }) - x;
      const height =
        getRowOffset({
          index: bottom + 1,
          rowHeight,
          columnWidth,
          instanceProps: instanceProps.current,
        }) - y;

      const cellRenderer = itemRenderer({
        x,
        y,
        width,
        height,
        rowIndex,
        columnIndex,
        key: itemKey({ rowIndex, columnIndex }),
      });

      if (isLeftBoundFrozen) {
        frozenColumnMergedCellAreas.push(cellRenderer);
      }

      if (isTopBoundFrozen) {
        frozenRowMergedCellAreas.push(cellRenderer);
      }

      if (isIntersectionFrozen)
        frozenIntersectionMergedCells.push(cellRenderer);

      mergedCellAreas.push(cellRenderer);
    }

    /* Draw frozen rows */
    const frozenRowCells = [];
    for (
      let rowIndex = 0;
      rowIndex < Math.min(columnStopIndex, frozenRows);
      rowIndex++
    ) {
      /**
       * Do any pre-processing of the row before being renderered.
       * Useful for `react-table` to call `prepareRow(row)`
       */
      onBeforeRenderRow && onBeforeRenderRow(rowIndex);

      for (
        let columnIndex = columnStartIndex;
        columnIndex <= columnStopIndex;
        columnIndex++
      ) {
        /* Skip merged cells columns */
        if (isMergedCell({ rowIndex, columnIndex })) {
          continue;
        }
        const x = getColumnOffset({
          index: columnIndex,
          rowHeight,
          columnWidth,
          instanceProps: instanceProps.current,
        });
        const y = getRowOffset({
          index: rowIndex,
          rowHeight,
          columnWidth,
          instanceProps: instanceProps.current,
        });
        const width = getColumnWidth(columnIndex, instanceProps.current);
        const height = getRowHeight(rowIndex, instanceProps.current);

        frozenRowCells.push(
          itemRenderer({
            x,
            y,
            width,
            height,
            rowIndex,
            columnIndex,
            key: itemKey({ rowIndex, columnIndex }),
          })
        );
      }
    }

    /* Draw frozen columns */
    const frozenColumnCells = [];
    for (let rowIndex = rowStartIndex; rowIndex <= rowStopIndex; rowIndex++) {
      /**
       * Do any pre-processing of the row before being renderered.
       * Useful for `react-table` to call `prepareRow(row)`
       */
      onBeforeRenderRow && onBeforeRenderRow(rowIndex);

      for (
        let columnIndex = 0;
        columnIndex < Math.min(columnStopIndex, frozenColumns);
        columnIndex++
      ) {
        /* Skip merged cells columns */
        if (isMergedCell({ rowIndex, columnIndex })) {
          continue;
        }
        const x = getColumnOffset({
          index: columnIndex,
          rowHeight,
          columnWidth,
          instanceProps: instanceProps.current,
        });
        const y = getRowOffset({
          index: rowIndex,
          rowHeight,
          columnWidth,
          instanceProps: instanceProps.current,
        });
        const width = getColumnWidth(columnIndex, instanceProps.current);
        const height = getRowHeight(rowIndex, instanceProps.current);
        frozenColumnCells.push(
          itemRenderer({
            x,
            y,
            width,
            height,
            rowIndex,
            columnIndex,
            key: itemKey({ rowIndex, columnIndex }),
          })
        );
      }
    }

    /**
     * Frozen column shadow
     */
    const frozenColumnShadow = useMemo(() => {
      const frozenColumnLineX = getColumnOffset({
        index: frozenColumns,
        rowHeight,
        columnWidth,
        instanceProps: instanceProps.current,
      });
      return (
        <Line
          points={[frozenColumnLineX, 0, frozenColumnLineX, containerHeight]}
          offsetX={1}
          {...shadowSettings}
        />
      );
    }, [shadowSettings, frozenColumns, containerHeight]);

    /**
     * Frozen row shadow
     */
    const frozenRowShadow = useMemo(() => {
      const frozenRowLineY = getRowOffset({
        index: frozenRows,
        rowHeight,
        columnWidth,
        instanceProps: instanceProps.current,
      });
      return (
        <Line
          points={[0, frozenRowLineY, containerWidth, frozenRowLineY]}
          offsetY={1}
          {...shadowSettings}
        />
      );
    }, [shadowSettings, frozenRows, containerWidth]);

    /* Draw frozen intersection cells */
    const frozenIntersectionCells = [];
    for (
      let rowIndex = 0;
      rowIndex < Math.min(rowStopIndex, frozenRows);
      rowIndex++
    ) {
      /**
       * Do any pre-processing of the row before being renderered.
       * Useful for `react-table` to call `prepareRow(row)`
       */
      onBeforeRenderRow && onBeforeRenderRow(rowIndex);

      for (
        let columnIndex = 0;
        columnIndex < Math.min(columnStopIndex, frozenColumns);
        columnIndex++
      ) {
        /* Skip merged cells columns */
        if (isMergedCell({ rowIndex, columnIndex })) {
          continue;
        }
        const x = getColumnOffset({
          index: columnIndex,
          rowHeight,
          columnWidth,
          instanceProps: instanceProps.current,
        });
        const y = getRowOffset({
          index: rowIndex,
          rowHeight,
          columnWidth,
          instanceProps: instanceProps.current,
        });
        const width = getColumnWidth(columnIndex, instanceProps.current);
        const height = getRowHeight(rowIndex, instanceProps.current);
        frozenIntersectionCells.push(
          itemRenderer({
            x,
            y,
            width,
            height,
            rowIndex,
            columnIndex,
            key: itemKey({ rowIndex, columnIndex }),
          })
        );
      }
    }

    /**
     * Renders active cell
     */
    let fillHandleDimension = {};
    let activeCellSelection = null;
    let activeCellSelectionFrozenColumn = null;
    let activeCellSelectionFrozenRow = null;
    let activeCellSelectionFrozenIntersection = null;
    if (activeCell) {
      const bounds = getCellBounds(activeCell);
      const { top, left, right, bottom } = bounds;
      const actualBottom = Math.min(rowStopIndex, bottom);
      const actualRight = Math.min(columnStopIndex, right);
      const isInFrozenColumn = left < frozenColumns;
      const isInFrozenRow = top < frozenRows;
      const isInFrozenIntersection = isInFrozenRow && isInFrozenColumn;
      const y = getRowOffset({
        index: top,
        rowHeight,
        columnWidth,
        instanceProps: instanceProps.current,
      });
      const height =
        getRowOffset({
          index: actualBottom,
          rowHeight,
          columnWidth,
          instanceProps: instanceProps.current,
        }) -
        y +
        getRowHeight(actualBottom, instanceProps.current);

      const x = getColumnOffset({
        index: left,
        rowHeight,
        columnWidth,
        instanceProps: instanceProps.current,
      });

      const width =
        getColumnOffset({
          index: actualRight,
          rowHeight,
          columnWidth,
          instanceProps: instanceProps.current,
        }) -
        x +
        getColumnWidth(actualRight, instanceProps.current);

      const cell = selectionRenderer({
        stroke: selectionBorderColor,
        strokeWidth: activeCellStrokeWidth,
        fill: "transparent",
        x: x,
        y: y,
        width: width,
        height: height,
      });

      if (isInFrozenIntersection) {
        activeCellSelectionFrozenIntersection = cell;
      } else if (isInFrozenRow) {
        activeCellSelectionFrozenRow = cell;
      } else if (isInFrozenColumn) {
        activeCellSelectionFrozenColumn = cell;
      } else {
        activeCellSelection = cell;
      }

      fillHandleDimension = {
        x: x + width,
        y: y + height,
      };
    }

    /**
     * Convert selections to area
     * Removed useMemo as changes to lastMeasureRowIndex, lastMeasuredColumnIndex,
     * does not trigger useMemo
     * Dependencies : [selections, rowStopIndex, columnStopIndex, instanceProps]
     */

    let isSelectionInProgress = false;
    const selectionAreas = [];
    const selectionAreasFrozenColumns = [];
    const selectionAreasFrozenRows = [];
    const selectionAreasIntersection = [];
    for (let i = 0; i < selections.length; i++) {
      const { bounds, inProgress, style } = selections[i];
      const { top, left, right, bottom } = bounds;
      const selectionBounds = { x: 0, y: 0, width: 0, height: 0 };
      const actualBottom = Math.min(rowStopIndex, bottom);
      const actualRight = Math.min(columnStopIndex, right);
      const isLeftBoundFrozen = left < frozenColumns;
      const isTopBoundFrozen = top < frozenRows;
      const isIntersectionFrozen = top < frozenRows && left < frozenColumns;
      const isLast = i === selections.length - 1;
      const styles = {
        stroke: inProgress ? selectionBackgroundColor : selectionBorderColor,
        fill: selectionBackgroundColor,
        ...style,
      };
      if (inProgress) isSelectionInProgress = true;
      selectionBounds.y = getRowOffset({
        index: top,
        rowHeight,
        columnWidth,
        instanceProps: instanceProps.current,
      });
      selectionBounds.height =
        getRowOffset({
          index: actualBottom,
          rowHeight,
          columnWidth,
          instanceProps: instanceProps.current,
        }) -
        selectionBounds.y +
        getRowHeight(actualBottom, instanceProps.current);

      selectionBounds.x = getColumnOffset({
        index: left,
        rowHeight,
        columnWidth,
        instanceProps: instanceProps.current,
      });

      selectionBounds.width =
        getColumnOffset({
          index: actualRight,
          rowHeight,
          columnWidth,
          instanceProps: instanceProps.current,
        }) -
        selectionBounds.x +
        getColumnWidth(actualRight, instanceProps.current);

      if (isLeftBoundFrozen) {
        const frozenColumnSelectionWidth = Math.min(
          selectionBounds.width,
          getColumnOffset({
            index: frozenColumns - left,
            rowHeight,
            columnWidth,
            instanceProps: instanceProps.current,
          })
        );
        selectionAreasFrozenColumns.push(
          selectionRenderer({
            ...styles,
            key: i,
            x: selectionBounds.x,
            y: selectionBounds.y,
            width: frozenColumnSelectionWidth,
            height: selectionBounds.height,
            strokeRightWidth:
              frozenColumnSelectionWidth === selectionBounds.width
                ? selectionStrokeWidth
                : 0,
          })
        );
      }

      if (isTopBoundFrozen) {
        const frozenRowSelectionHeight = Math.min(
          selectionBounds.height,
          getRowOffset({
            index: frozenRows - top,
            rowHeight,
            columnWidth,
            instanceProps: instanceProps.current,
          })
        );
        selectionAreasFrozenRows.push(
          selectionRenderer({
            ...styles,
            key: i,
            x: selectionBounds.x,
            y: selectionBounds.y,
            width: selectionBounds.width,
            height: frozenRowSelectionHeight,
            strokeBottomWidth:
              frozenRowSelectionHeight === selectionBounds.height
                ? selectionStrokeWidth
                : 0,
          })
        );
      }

      if (isIntersectionFrozen) {
        const frozenIntersectionSelectionHeight = Math.min(
          selectionBounds.height,
          getRowOffset({
            index: frozenRows - top,
            rowHeight,
            columnWidth,
            instanceProps: instanceProps.current,
          })
        );

        const frozenIntersectionSelectionWidth = Math.min(
          selectionBounds.width,
          getColumnOffset({
            index: frozenColumns - left,
            rowHeight,
            columnWidth,
            instanceProps: instanceProps.current,
          })
        );

        selectionAreasIntersection.push(
          selectionRenderer({
            ...styles,
            key: i,
            x: selectionBounds.x,
            y: selectionBounds.y,
            width: frozenIntersectionSelectionWidth,
            height: frozenIntersectionSelectionHeight,
            strokeBottomWidth:
              frozenIntersectionSelectionHeight === selectionBounds.height
                ? selectionStrokeWidth
                : 0,
            strokeRightWidth:
              frozenIntersectionSelectionWidth === selectionBounds.width
                ? selectionStrokeWidth
                : 0,
          })
        );
      }

      selectionAreas.push(
        selectionRenderer({
          ...styles,
          key: i,
          x: selectionBounds.x,
          y: selectionBounds.y,
          width: selectionBounds.width,
          height: selectionBounds.height,
        })
      );

      if (isLast) {
        fillHandleDimension = {
          x: selectionBounds.x + selectionBounds.width,
          y: selectionBounds.y + selectionBounds.height,
        };
      }
    }

    /**
     * Fillselection
     */
    let fillSelections = null;
    if (fillSelection) {
      const { bounds } = fillSelection;
      const { top, left, right, bottom } = bounds;
      const actualBottom = Math.min(rowStopIndex, bottom);
      const actualRight = Math.min(columnStopIndex, right);
      const x = getColumnOffset({
        index: left,
        rowHeight,
        columnWidth,
        instanceProps: instanceProps.current,
      });
      const y = getRowOffset({
        index: top,
        rowHeight,
        columnWidth,
        instanceProps: instanceProps.current,
      });
      const height =
        getRowOffset({
          index: actualBottom,
          rowHeight,
          columnWidth,
          instanceProps: instanceProps.current,
        }) -
        y +
        getRowHeight(actualBottom, instanceProps.current);
      const width =
        getColumnOffset({
          index: actualRight,
          rowHeight,
          columnWidth,
          instanceProps: instanceProps.current,
        }) -
        x +
        getColumnWidth(actualRight, instanceProps.current);
      fillSelections = selectionRenderer({
        x,
        y,
        width,
        height,
        stroke: "gray",
        strokeStyle: "dashed",
      });
    }

    const borderStylesCells = useMemo(() => {
      const borderStyleCells = [];
      for (let i = 0; i < borderStyles.length; i++) {
        const { bounds, style } = borderStyles[i];
        const { top, right, bottom, left } = bounds;
        const x = getColumnOffset({
          index: left,
          rowHeight,
          columnWidth,
          instanceProps: instanceProps.current,
        });
        const y = getRowOffset({
          index: top,
          rowHeight,
          columnWidth,
          instanceProps: instanceProps.current,
        });
        const width =
          getColumnOffset({
            index: Math.min(columnCount - 1, right + 1),
            rowHeight,
            columnWidth,
            instanceProps: instanceProps.current,
          }) - x;
        const height =
          getRowOffset({
            index: Math.min(rowCount - 1, bottom + 1),
            rowHeight,
            columnWidth,
            instanceProps: instanceProps.current,
          }) - y;

        borderStyleCells.push(
          createHTMLBox({
            x,
            y,
            width,
            height,
            ...style,
          })
        );
      }

      return borderStyleCells;
    }, [borderStyles, columnStopIndex, rowStopIndex, columnCount, rowCount]);

    /**
     * Prevents drawing hit region when scrolling
     */
    const listenToEvents = !isScrolling;
    /* Frozen row shadow */
    const frozenRowShadowComponent =
      showFrozenShadow && frozenRows !== 0 && scrollTop !== 0
        ? frozenRowShadow
        : null;
    /* Frozen column shadow */
    const frozenColumnShadowComponent =
      showFrozenShadow && frozenColumns !== 0 && scrollLeft !== 0
        ? frozenColumnShadow
        : null;
    const stageChildren = (
      <>
        <Layer offsetY={scrollTop} offsetX={scrollLeft}>
          {cells}
          {mergedCellAreas}
          {ranges}
        </Layer>

        <Layer>
          <Group
            offsetY={scrollTop}
            offsetX={scrollLeft}
            listening={false}
          ></Group>
          {frozenRowShadowComponent}
          {frozenColumnShadowComponent}
          <Group offsetY={0} offsetX={scrollLeft}>
            {frozenRowCells}
            {frozenRowMergedCellAreas}
          </Group>
          <Group offsetY={scrollTop} offsetX={0}>
            {frozenColumnCells}
            {frozenColumnMergedCellAreas}
          </Group>
          <Group offsetY={0} offsetX={0}>
            {frozenIntersectionCells}
            {frozenIntersectionMergedCells}
          </Group>
        </Layer>
        {children && typeof children === "function"
          ? children({
              scrollLeft,
              scrollTop,
            })
          : null}
      </>
    );
    const fillHandleWidth = 8;
    const fillhandleComponent =
      showFillHandle && !isSelectionInProgress ? (
        <FillHandle
          {...fillHandleDimension}
          stroke={selectionBorderColor}
          size={fillHandleWidth}
          {...fillHandleProps}
        />
      ) : null;
    const selectionChildren = (
      <div
        style={{
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: frozenColumnWidth,
            top: frozenRowHeight,
            right: 0,
            bottom: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              transform: `translate(-${scrollLeft + frozenColumnWidth}px, -${
                scrollTop + frozenRowHeight
              }px)`,
            }}
          >
            {borderStylesCells}
            {fillSelections}
            {selectionAreas}
            {activeCellSelection}
            {fillhandleComponent}
          </div>
        </div>
        {frozenColumns ? (
          <div
            style={{
              position: "absolute",
              width: frozenColumnWidth + fillHandleWidth,
              top: frozenRowHeight,
              left: 0,
              bottom: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                transform: `translate(0, -${scrollTop + frozenRowHeight}px)`,
              }}
            >
              {selectionAreasFrozenColumns}
              {activeCellSelectionFrozenColumn}
              {fillhandleComponent}
            </div>
          </div>
        ) : null}
        {frozenRows ? (
          <div
            style={{
              position: "absolute",
              height: frozenRowHeight + fillHandleWidth,
              left: frozenColumnWidth,
              right: 0,
              top: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                transform: `translate(-${scrollLeft + frozenColumnWidth}px, 0)`,
              }}
            >
              {selectionAreasFrozenRows}
              {activeCellSelectionFrozenRow}
              {fillhandleComponent}
            </div>
          </div>
        ) : null}
        {frozenRows && frozenColumns ? (
          <div
            style={{
              position: "absolute",
              height: frozenRowHeight + fillHandleWidth,
              width: frozenColumnWidth + fillHandleWidth,
              left: 0,
              top: 0,
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            {selectionAreasIntersection}
            {activeCellSelectionFrozenIntersection}
            {fillhandleComponent}
          </div>
        ) : null}
      </div>
    );
    return (
      <div
        style={{
          position: "relative",
          width: containerWidth,
          userSelect: "none",
        }}
      >
        <div tabIndex={0} ref={containerRef} {...rest}>
          <Stage
            width={containerWidth}
            height={containerHeight}
            ref={stageRef}
            listening={listenToEvents}
            {...stageProps}
          >
            {wrapper(stageChildren)}
          </Stage>
        </div>
        {selectionChildren}
        {showScrollbar ? (
          <>
            <div
              tabIndex={-1}
              style={{
                height: containerHeight,
                overflow: "scroll",
                position: "absolute",
                right: 0,
                top: 0,
                width: scrollbarSize,
                willChange: "transform",
              }}
              onScroll={handleScroll}
              ref={verticalScrollRef}
            >
              <div
                style={{
                  position: "absolute",
                  height: estimatedTotalHeight,
                  width: 1,
                }}
              />
            </div>
            <div
              tabIndex={-1}
              style={{
                overflow: "scroll",
                position: "absolute",
                bottom: 0,
                left: 0,
                width: containerWidth,
                height: scrollbarSize,
                willChange: "transform",
              }}
              onScroll={handleScrollLeft}
              ref={horizontalScrollRef}
            >
              <div
                style={{
                  position: "absolute",
                  width: estimatedTotalWidth,
                  height: 1,
                }}
              />
            </div>
          </>
        ) : null}
      </div>
    );
  })
);

export default Grid;
