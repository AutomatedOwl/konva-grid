import { Grid } from 'react-konva-grid'
import { Layer, Group, Text, Rect } from 'react-konva'
import React  from "react";

const SquaresGrid = () => {
  const Cell = ({ rowIndex, columnIndex, x, y, width, height}) => {
    return (
      <Layer>
        <Rect
          x={x}
          y={y}
          height={height}
          width={width}
          fill="white"
          stroke="grey"
        />
        <Text
          x={x}
          y={y}
          height={height}
          width={width}
          text={'ABC'}
          verticalAlign="middle"
          align="center"
        />
      </Layer>
    )
  }
  const Header = ({ rowIndex, columnIndex, x, y, width, height, key, value }) => {
    return (
      <Group key={key}>
        <Rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="#eee"
          stroke="#bbb"
          strokeWidth={1}
        />
        <Text
          x={x}
          y={y}
          width={width}
          height={height}
          text={value}
          verticalAlign="middle"
          offsetX={-10}
        />
      </Group>
    );
  };
  
  return (
    <Grid
      rowCount={20}
      columnCount={40}
      width={900}
      height={500}
      rowHeight={(rowIndex) => 20}
      columnWidth={(columnIndex) => 20}
      showScrollbar={false}
      itemRenderer={(props) => {
        return <Header {...props} value={'1'} />;
      }}
    >
      
    </Grid>
  )
}

export default SquaresGrid;