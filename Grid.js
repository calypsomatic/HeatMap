/* Modeled on https://gist.github.com/jukben/a8170c4fdfa85806310bee60bb4a384c and https://gist.github.com/letmaik/e71eae5b3ae9e09f8aeb288c3b95230b*/

import { withLeaflet, GridLayer } from "react-leaflet";
import L from "leaflet";

class Grid extends GridLayer {

  createLeafletElement() {

    // const poly = this.props.poly;
    this.state = {
      polygons: this.props.poly,
      map: this.props.map
    };

    const Layer = L.GridLayer.extend({
      createTile: (coords) => {
        console.log("create tiles");
        console.log(this.state);
        var tile = L.DomUtil.create('canvas', 'leaflet-tile');
        var ctx = tile.getContext('2d');
        var size = this.leafletElement.getTileSize()
        tile.width = size.x
        tile.height = size.y

        var nwPoint = coords.scaleBy(size)

        // calculate geographic coordinates of top left tile pixel
        var nw = this.state.map.leafletElement.unproject(nwPoint, coords.z)

        console.log(this.props.poly)
        console.log(nw);

        var minX = this.props.poly[ 0 ][0];
        var maxX = this.props.poly[ 0 ][0];
        var minY = this.props.poly[ 0 ][1];
        var maxY = this.props.poly[ 0 ][1];
        for (var i = 1 ; i < this.props.poly.length ; i++ )    {
         var q = this.props.poly[i];
         console.log(q);
         minX = Math.min( q[0], minX );
         maxX = Math.max( q[0], maxX );
         minY = Math.min( q[1], minY );
         maxY = Math.max( q[1], maxY );
       }

       console.log(minX, maxX, minY, maxY);
       if ( nw.lat < minX || nw.lat > maxX || nw.lng < minY || nw.lng > maxY )
       {
        ctx.fillStyle = "rgba(192, 192, 192, 0.9)";
        }
else {
  ctx.fillStyle = "rgba(150, 102, 92, 0.3)";

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
