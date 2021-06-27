import { createElement } from "./framework.js";
import { Carousel } from "./Carousel.js";
import { Button } from "./Button.js";
import { List } from "./List.js";

let images = [
  {
    img: "https://static001.geekbang.org/resource/image/bb/21/bb38fb7c1073eaee1755f81131f11d21.jpg",
    title: "11"
  },
  {
    img: "https://static001.geekbang.org/resource/image/1b/21/1b809d9a2bdf3ecc481322d7c9223c21.jpg",
    title: "22"
  },
  {
    img: "https://static001.geekbang.org/resource/image/b6/4f/b6d65b2f12646a9fd6b8cb2b020d754f.jpg",
    title: "33"
  },
  {
    img: "https://static001.geekbang.org/resource/image/73/e4/730ea9c393def7975deceb48b3eb6fe4.jpg",
    title: "44"
  }
];

// let a = (
//   <Carousel
//     src={images}
//     onChange={(event) => console.log(event.detail.position)}
//     onClick={(event) => console.log(event.detail.data)}
//   />
// );

// a.mountTo(document.body);

let button = (
  <List data={images}>
    {(record) => (
      <div>
        <img src={record.img} />
        <a href={record.url}>{record.title}</a>
      </div>
    )}
  </List>
);
button.mountTo(document.body);
