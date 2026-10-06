import { AlertTriangle } from 'lucide-react'
import { Button, Modal, useOverlayState } from '@heroui/react'

type ProductDeleteConfirmationModalProps = {
  state: ReturnType<typeof useOverlayState>
  productName: string | null
  isPending: boolean
  errorMessage?: string | null
  onConfirm: () => void
}

export function ProductDeleteConfirmationModal({
  state,
  productName,
  isPending,
  errorMessage,
  onConfirm,
}: ProductDeleteConfirmationModalProps) {
  return (
    <Modal.Root state={state}>
      <Modal.Backdrop className="product-delete__backdrop" isDismissable={!isPending}>
        <Modal.Container className="product-delete__container" placement="center" size="md">
          <Modal.Dialog className="product-delete__dialog">
            <Modal.Header className="product-delete__header">
              <Modal.Icon className="product-delete__icon">
                <AlertTriangle size={22} aria-hidden="true" />
              </Modal.Icon>
              <Modal.Heading className="product-delete__heading">Xóa sản phẩm?</Modal.Heading>
            </Modal.Header>

            <Modal.Body className="product-delete__body">
              <p>
                Sản phẩm “{productName}” sẽ không còn xuất hiện trong quản trị và trên website. Dữ liệu và ảnh vẫn được lưu giữ,
                nhưng hiện chưa thể khôi phục.
              </p>
              {errorMessage && <p className="product-delete__error" role="alert">{errorMessage}</p>}
            </Modal.Body>

            <Modal.Footer className="product-delete__footer">
              <Button type="button" variant="outline" isDisabled={isPending} onClick={() => state.close()}>
                Hủy
              </Button>
              <Button
                className="product-delete__submit"
                type="button"
                variant="primary"
                isDisabled={isPending}
                onClick={onConfirm}
              >
                {isPending ? 'Đang xóa...' : 'Xóa sản phẩm'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  )
}
