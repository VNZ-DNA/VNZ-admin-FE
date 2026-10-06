import { AlertTriangle } from 'lucide-react'
import { Button, Modal, useOverlayState } from '@heroui/react'

type JobPostDeleteConfirmationModalProps = {
  state: ReturnType<typeof useOverlayState>
  jobPostTitle: string | null
  isPending: boolean
  errorMessage?: string | null
  onConfirm: () => void
}

export function JobPostDeleteConfirmationModal({
  state,
  jobPostTitle,
  isPending,
  errorMessage,
  onConfirm,
}: JobPostDeleteConfirmationModalProps) {
  return (
    <Modal.Root state={state}>
      <Modal.Backdrop className="job-post-delete__backdrop" isDismissable={!isPending}>
        <Modal.Container className="job-post-delete__container" placement="center" size="md">
          <Modal.Dialog className="job-post-delete__dialog">
            <Modal.Header className="job-post-delete__header">
              <Modal.Icon className="job-post-delete__icon">
                <AlertTriangle size={22} aria-hidden="true" />
              </Modal.Icon>
              <Modal.Heading className="job-post-delete__heading">Xóa tin tuyển dụng?</Modal.Heading>
            </Modal.Header>

            <Modal.Body className="job-post-delete__body">
              <p>
                Tin “{jobPostTitle}” sẽ không còn xuất hiện trong quản trị và trên website. Dữ liệu vẫn được lưu giữ,
                nhưng hiện chưa thể khôi phục.
              </p>
              {errorMessage && <p className="job-post-delete__error" role="alert">{errorMessage}</p>}
            </Modal.Body>

            <Modal.Footer className="job-post-delete__footer">
              <Button type="button" variant="outline" isDisabled={isPending} onClick={() => state.close()}>
                Hủy
              </Button>
              <Button
                className="job-post-delete__submit"
                type="button"
                variant="primary"
                isDisabled={isPending}
                onClick={onConfirm}
              >
                {isPending ? 'Đang xóa...' : 'Xóa tin tuyển dụng'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  )
}
