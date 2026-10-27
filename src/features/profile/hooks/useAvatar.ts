import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteAvatar, type PickedAsset, uploadAvatar } from '@/features/uploads/uploadsApi';

import { CANDIDATE_ME_KEY } from './useCandidateMe';

/** Set or remove the profile picture, then reload the candidate so the new picture shows. */
export function useAvatar() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: CANDIDATE_ME_KEY });
  const set = useMutation({ mutationFn: (file: PickedAsset) => uploadAvatar(file), onSuccess: refresh });
  const remove = useMutation({ mutationFn: deleteAvatar, onSuccess: refresh });
  return { set, remove };
}
