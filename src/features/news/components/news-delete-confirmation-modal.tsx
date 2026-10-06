import { AlertTriangle } from 'lucide-react'
import { Button, Modal, useOverlayState } from '@heroui/react'

type NewsDeleteConfirmationModalProps = {
  state: ReturnType<typeof useOverlayState>
  articleTitle: string | null
  isPending: boolean
  errorMessage?: string | null
  onConfirm: () => void
}

export function NewsDeleteConfirmationModal({
  state,
  articleTitle,
  isPending,
  errorMessage,
  onConfirm,
}: NewsDeleteConfirmationModalProps) {
  return (
    <Modal.Root state={state}>
      <Modal.Backdrop className="news-delete__backdrop" isDismissable={!isPending}>
        <Modal.Container className="news-delete__container" placement="center" size="md">
          <Modal.Dialog className="news-delete__dialog">
            <Modal.Header className="news-delete__header">
              <Modal.Icon className="news-delete__icon">
                <AlertTriangle size={22} aria-hidden="true" />
              </Modal.Icon>
              <Modal.Heading className="news-delete__heading">Xóa bài viết?</Modal.Heading>
            </Modal.Header>

            <Modal.Body className="news-delete__body">
              <p>
                Bài “{articleTitle}” sẽ không còn xuất hiện trong quản trị và trên website. Dữ liệu và ảnh vẫn được lưu giữ,
                nhưng hiện chưa thể khôi phục.
              </p>
              {errorMessage && <p className="news-delete__error" role="alert">{errorMessage}</p>}
            </Modal.Body>

            <Modal.Footer className="news-delete__footer">
              <Button type="button" variant="outline" isDisabled={isPending} onClick={() => state.close()}>
                Hủy
              </Button>
              <Button
                className="news-delete__submit"
                type="button"
                variant="primary"
                isDisabled={isPending}
                onClick={onConfirm}
              >
                {isPending ? 'Đang xóa...' : 'Xóa bài viết'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  )
}
