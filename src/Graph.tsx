import React, { Component } from 'react';
import { Table } from '@finos/perspective';
import { ServerRespond } from './DataStreamer';
import './Graph.css';

/**
 * Props declaration for <Graph />
 */
interface IProps {
  data: ServerRespond[],
}

/**
 * Perspective library adds load to HTMLElement prototype.
 * This interface acts as a wrapper for Typescript compiler.
 */
interface PerspectiveViewerElement extends HTMLElement {
  load: (table: Table) => void,
}

/**
 * React component that renders Perspective based on data
 * parsed from its parent through data property.
 */
class Graph extends Component<IProps, { latestTimestamp: Date | undefined }> {
  // Perspective table
  table: Table | undefined;

  constructor(props: IProps) {
    super(props);
    this.state = { latestTimestamp: undefined };
  }

  render() {
    return React.createElement('perspective-viewer');
  }

  componentDidMount() {
    // Get element to attach the table from the DOM.
    const elem = document.getElementsByTagName('perspective-viewer')[0] as PerspectiveViewerElement;

    const schema = {
      stock: 'string',
      top_ask_price: 'float',
      top_bid_price: 'float',
      timestamp: 'date',
    };

    if (window.perspective && window.perspective.worker()) {
      this.table = window.perspective.worker().table(schema);
    }

    if (this.table) {
      // Load the `table` in the `<perspective-viewer>` DOM reference.

      // Add more Perspective configurations here.
      elem.load(this.table);
      elem.setAttribute('view', 'y_line');
      elem.setAttribute('column-pivots', '["stock"]');
      elem.setAttribute('row-pivots', '["timestamp"]');
      elem.setAttribute('columns', '["top_ask_price"]');
      elem.setAttribute('aggregates', JSON.stringify({
        stock: "distinct count",
        top_ask_price: "avg",
        top_bid_price: "avg",
        timestamp: "distinct count",
      }));
    }
  }

  componentDidUpdate() {
    if (this.table) {
      // Filter out duplicate data
      const newData = this.props.data.filter((el) => {
        const timestamp = new Date(el.timestamp);
        return !this.state.latestTimestamp || timestamp > this.state.latestTimestamp;
      });

      // Update table with filtered data
      if (newData.length > 0) {
        this.table.update(newData.map((el: any) => {
          // Format the data from ServerRespond to the schema
          return {
            stock: el.stock,
            top_ask_price: el.top_ask && el.top_ask.price || 0,
            top_bid_price: el.top_bid && el.top_bid.price || 0,
            timestamp: el.timestamp,
          };
        }));

        // Update latest timestamp
        this.setState({
          latestTimestamp: newData.reduce((latest, el) => {
            const timestamp = new Date(el.timestamp);
            return !latest || timestamp > latest ? timestamp : latest;
          }, this.state.latestTimestamp)
        });
      }
    }
  }
}

export default Graph;
