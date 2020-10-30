/* Modeled on https://gist.github.com/jukben/a8170c4fdfa85806310bee60bb4a384c and https://gist.github.com/letmaik/e71eae5b3ae9e09f8aeb288c3b95230b*/

import { withLeaflet, GridLayer } from "react-leaflet";
import L from "leaflet";

class Grid extends GridLayer {

  constructor(props) {
    super(props);
    console.log("constructor:")
    console.log(props);
    this.state = {
      polygons: props.poly,
      map: props.leaflet.map
    }
    console.log(this.state);
  }

  //taken from here: https://stackoverflow.com/questions/217578/how-can-i-determine-whether-a-2d-point-is-within-a-polygon
  pnpoly(nvert, verts, testx, testy) {
    var i, j, c = 0;
    for (i = 0, j = nvert-1; i < nvert; j = i++) {
      if ( ((verts[i][1]>testy) != (verts[j][1]>testy)) &&
        (testx < (verts[j][0]-verts[i][0]) * (testy-verts[i][1]) / (verts[j][1]-verts[i][1]) + verts[i][0]) ){
          c = !c;
        }
      }
      return c;
    }

  createLeafletElement() {

    // const poly = this.props.poly;
    // this.state = {
    //   polygons: this.props.poly,
    //   map: this.props.map
    // };

    const Layer = L.GridLayer.extend({
      createTile: (coords) => {
        // console.log("create tiles");
        // console.log(this.state);
        var tile = L.DomUtil.create('canvas', 'leaflet-tile');
        var ctx = tile.getContext('2d');
        var size = this.leafletElement.getTileSize()
        tile.width = size.x
        tile.height = size.y

        var nwPoint = coords.scaleBy(size)

        // calculate geographic coordinates of top left tile pixel
        // var nw = this.state.map.leafletElement.unproject(nwPoint, coords.z)
        var nw = this.state.map.unproject(nwPoint, coords.z)

        // console.log(this.props.poly)
        // console.log(nw);

       var xs = []

       if (this.pnpoly(this.props.poly.length, this.props.poly, nw.lat, nw.lng))
       {
         ctx.fillStyle = "rgba(255, 0, 0, 0.2)";

        }
else {
  ctx.fillStyle = "rgba(192, 192, 192, 0.9)";

}

         ctx.fillRect(0, 0, size.x, size.y);

        return tile;
      }
    });

    return new Layer();
  }

//   updateLeafletElement(fromProps, toProps) {
//     console.log("update");
//     super.updateLeafletElement(fromProps, toProps);
// }

}

export default withLeaflet(Grid);
