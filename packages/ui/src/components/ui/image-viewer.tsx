import Lightbox from "yet-another-react-lightbox"
import Counter from "yet-another-react-lightbox/plugins/counter"
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails"
import Zoom from "yet-another-react-lightbox/plugins/zoom"
import "yet-another-react-lightbox/styles.css"
import "yet-another-react-lightbox/plugins/counter.css"
import "yet-another-react-lightbox/plugins/thumbnails.css"

type ImageViewerImage = {
  src: string
  alt?: string
}

type ImageViewerProps = {
  images: ImageViewerImage[]
  index: number
  open: boolean
  onClose: () => void
}

const LABELS = {
  Previous: "Anterior",
  Next: "Próxima",
  Close: "Fechar",
  Slide: "Imagem",
  Carousel: "Carrossel",
  Lightbox: "Visualizador de imagens",
  "Photo gallery": "Galeria de fotos",
  "{index} of {total}": "{index} de {total}",
  "Zoom in": "Aproximar",
  "Zoom out": "Afastar",
  Thumbnails: "Miniaturas",
  "Show thumbnails": "Mostrar miniaturas",
  "Hide thumbnails": "Ocultar miniaturas",
}

function ImageViewer({ images, index, open, onClose }: ImageViewerProps) {
  const hasMany = images.length > 1

  return (
    <Lightbox
      open={open}
      close={onClose}
      index={index}
      slides={images}
      labels={LABELS}
      plugins={hasMany ? [Zoom, Thumbnails, Counter] : [Zoom]}
      carousel={{ finite: true }}
      controller={{ closeOnBackdropClick: true }}
      render={hasMany ? undefined : { buttonPrev: () => null, buttonNext: () => null }}
      zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
      thumbnails={{ border: 0, borderRadius: 12, gap: 8, width: 72, height: 72, imageFit: "cover" }}
      styles={{
        container: { backgroundColor: "rgb(10 10 10)" },
        thumbnailsContainer: { backgroundColor: "rgb(10 10 10)" },
      }}
    />
  )
}

export { ImageViewer }
export type { ImageViewerImage }
